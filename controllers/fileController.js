const mongoose = require('mongoose');
const File = require('../models/File');
const Folder = require('../models/Folder');
const User = require('../models/User');
const ShareLink = require('../models/ShareLink');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const storageService = require('../services/storageService');

// Upload file
exports.uploadFile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) { console.error('Error cleaning up invalid upload:', e); }
      }
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { name, folderId, description } = req.body;
    const cleanFolderId = (folderId && folderId !== 'null' && folderId !== 'undefined') ? folderId : null;
    const userId = req.user.id;

    // Check if folder exists and belongs to user
    if (cleanFolderId) {
      const folder = await Folder.findOne({ _id: cleanFolderId, userId });
      if (!folder) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) { console.error(e); }
        }
        return res.status(404).json({ message: 'Folder not found' });
      }
    }

    // Check if file with same name exists in the same location
    const fileNameToSave = (name && name.trim()) || req.file.originalname;
    const existingFile = await File.findOne({
      name: fileNameToSave,
      folderId: cleanFolderId,
      userId,
      isTrashed: false
    });

    if (existingFile) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) { console.error(e); }
      }
      return res.status(400).json({ message: 'File with this name already exists in this location' });
    }

    // Update user storage usage
    const user = await User.findById(userId);
    if (!user) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) { console.error(e); }
      }
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.storageUsed + req.file.size > user.storageLimit) {
      // Clean up uploaded file if storage limit exceeded
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) { console.error(e); }
      }
      return res.status(413).json({ 
        message: 'Storage limit exceeded',
        storageInfo: user.getStorageInfo()
      });
    }

    // Upload to storage (Cloudinary if configured, else local fallback)
    const storageResult = await storageService.uploadFile(
      req.file.path,
      req.file.originalname,
      req.file.mimetype,
      userId
    );

    const file = new File({
      name: fileNameToSave,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      folderId: cleanFolderId,
      userId,
      description: description || '',
      filePath: storageResult.filePath,
      cloudinaryId: storageResult.cloudinaryId,
      cloudinaryUrl: storageResult.cloudinaryUrl,
      resourceType: storageResult.resourceType,
      storageType: storageResult.storageType
    });

    await file.save();

    // Update user storage usage
    user.storageUsed += req.file.size;
    await user.save();

    res.status(201).json({ 
      message: 'File uploaded successfully', 
      file,
      storageInfo: user.getStorageInfo()
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { console.error(e); }
    }
    console.error('Upload file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Download file
exports.downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const file = await File.findOne({ _id: fileId, userId, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    return storageService.streamFile(file, res, 'attachment');
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get file metadata
exports.getFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.json({ file });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Rename file
exports.renameFile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fileId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    const file = await File.findOne({ _id: fileId, userId, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if name already exists in the same location
    const existingFile = await File.findOne({
      name,
      folderId: file.folderId,
      userId,
      isTrashed: false,
      _id: { $ne: fileId }
    });

    if (existingFile) {
      return res.status(400).json({ message: 'File with this name already exists in this location' });
    }

    file.name = name;
    file.updatedAt = new Date();
    await file.save();

    res.json({ message: 'File renamed successfully', file });
  } catch (error) {
    console.error('Rename file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Move file to different folder
exports.moveFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { folderId } = req.body;
    const userId = req.user.id;

    const file = await File.findOne({ _id: fileId, userId, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // If moving to a folder, verify it exists
    if (folderId) {
      const targetFolder = await Folder.findOne({ _id: folderId, userId });
      if (!targetFolder) {
        return res.status(404).json({ message: 'Target folder not found' });
      }
    }

    // Check if file with same name exists in target location
    const existingFile = await File.findOne({
      name: file.name,
      folderId: folderId || null,
      userId,
      isTrashed: false,
      _id: { $ne: fileId }
    });

    if (existingFile) {
      return res.status(400).json({ message: 'File with this name already exists in the target location' });
    }

    file.folderId = folderId || null;
    file.updatedAt = new Date();
    await file.save();

    res.json({ message: 'File moved successfully', file });
  } catch (error) {
    console.error('Move file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove file from folder (move to root)
exports.removeFromFolder = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const file = await File.findOne({ _id: fileId, userId, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (!file.folderId) {
      return res.status(400).json({ message: 'File is already in root directory' });
    }

    // Check if file with same name exists in root
    const existingFile = await File.findOne({
      name: file.name,
      folderId: null,
      userId,
      isTrashed: false,
      _id: { $ne: fileId }
    });

    if (existingFile) {
      return res.status(400).json({ message: 'File with this name already exists in root directory' });
    }

    file.folderId = null;
    file.updatedAt = new Date();
    await file.save();

    res.json({ message: 'File removed from folder successfully', file });
  } catch (error) {
    console.error('Remove from folder error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user files with pagination and filtering
exports.getFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { folderId, page = 1, limit = 20, search } = req.query;

    const query = { userId, isTrashed: false };
    const cleanFolderId = (folderId && folderId !== 'null' && folderId !== 'undefined') ? folderId : null;

    if (search) {
      query.name = { $regex: search, $options: 'i' };
      if (cleanFolderId) {
        query.folderId = cleanFolderId;
      }
    } else {
      query.folderId = cleanFolderId;
    }

    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await File.countDocuments(query);

    res.json({
      files,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete file permanently
exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const file = await File.findOne({ _id: fileId, userId, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete file from storage (Cloudinary or local)
    await storageService.deleteStoredFile(file);

    // Update user storage usage
    const user = await User.findById(userId);
    if (user) {
      user.storageUsed = Math.max(0, user.storageUsed - file.size);
      await user.save();
    }

    // Delete associated share links
    await ShareLink.deleteMany({ file: fileId });

    // Delete from database
    await File.findByIdAndDelete(fileId);

    res.json({ 
      message: 'File deleted successfully',
      storageInfo: user ? user.getStorageInfo() : null
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle file sharing
exports.toggleFileSharing = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { isPublic } = req.body;
    const userId = req.user.id;

    const file = await File.findOne({ _id: fileId, userId, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    file.isPublic = isPublic;
    if (isPublic) {
      file.shareToken = crypto.randomBytes(32).toString('hex');
    } else {
      file.shareToken = null;
    }
    file.updatedAt = new Date();
    await file.save();

    res.json({ message: 'File sharing updated successfully', file });
  } catch (error) {
    console.error('Toggle file sharing error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get shared file
exports.getSharedFile = async (req, res) => {
  try {
    const { shareToken } = req.params;

    const file = await File.findOne({ shareToken, isPublic: true, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: 'Shared file not found' });
    }

    res.json({ file });
  } catch (error) {
    console.error('Get shared file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Download shared file
exports.downloadSharedFile = async (req, res) => {
  try {
    const { shareToken } = req.params;

    const file = await File.findOne({ shareToken, isPublic: true, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: 'Shared file not found' });
    }

    return storageService.streamFile(file, res, 'attachment');
  } catch (error) {
    console.error('Download shared file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



// View file (for supported types like images, PDFs)
exports.viewFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    return storageService.streamFile(file, res, 'inline');

  } catch (error) {
    console.error('View file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
