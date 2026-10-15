const Folder = require('../models/Folder');
const File = require('../models/File');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const fs = require('fs');
const storageService = require('../services/storageService');

// Create folder
exports.createFolder = async (req, res) => {
  console.log('Request Body:', req.body);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, parentId } = req.body;
    const cleanParentId = (parentId && parentId !== 'null' && parentId !== 'undefined') ? parentId : null;
    const userId = req.user.id;

    // Check if parent folder exists and belongs to user
    if (cleanParentId) {
      const parentFolder = await Folder.findOne({ _id: cleanParentId, userId, isTrashed: false });
      if (!parentFolder) {
        return res.status(404).json({ message: 'Parent folder not found' });
      }
    }

    // Check if folder with same name exists in the same location
    const existingFolder = await Folder.findOne({
      name,
      parentId: cleanParentId,
      userId,
      isTrashed: false
    });

    if (existingFolder) {
      return res.status(400).json({ message: 'Folder with this name already exists in this location' });
    }

    const folder = new Folder({
      name,
      userId,
      parentId: cleanParentId
    });

    await folder.save();
    res.status(201).json({ message: 'Folder created successfully', folder });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user folders
exports.getFolders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { parentId } = req.query;
    const cleanParentId = (parentId && parentId !== 'null' && parentId !== 'undefined') ? parentId : null;

    const query = { userId, isTrashed: false, parentId: cleanParentId };

    const folders = await Folder.find(query).sort({ createdAt: -1 });
    res.json({ folders });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get folder details
exports.getFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;

    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    res.json({ folder });
  } catch (error) {
    console.error('Get folder error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update folder
exports.updateFolder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { folderId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    const folder = await Folder.findOne({ _id: folderId, userId, isTrashed: false });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Check if name already exists in the same location
    if (name && name !== folder.name) {
      const existingFolder = await Folder.findOne({
        name,
        parentId: folder.parentId,
        userId,
        isTrashed: false,
        _id: { $ne: folderId }
      });

      if (existingFolder) {
        return res.status(400).json({ message: 'Folder with this name already exists in this location' });
      }

      folder.name = name;
    }

    if (typeof req.body.isPublic === 'boolean') {
      folder.isPublic = req.body.isPublic;
      if (folder.isPublic && !folder.shareToken) {
        folder.shareToken = crypto.randomBytes(16).toString('hex');
      } else if (!folder.isPublic) {
        folder.shareToken = null;
      }
    }

    folder.updatedAt = new Date();
    await folder.save();

    res.json({ message: 'Folder updated successfully', folder });
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle folder public / private visibility
exports.toggleFolderVisibility = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const folderId = req.params.folderId || req.params.id;
    const { isPublic } = req.body;
    const userId = req.user.id || req.user._id;

    const folder = await Folder.findOne({ _id: folderId, userId, isTrashed: false });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const nextVisibility = typeof isPublic === 'boolean' ? isPublic : !folder.isPublic;
    folder.isPublic = nextVisibility;

    if (folder.isPublic) {
      if (!folder.shareToken) {
        folder.shareToken = crypto.randomBytes(16).toString('hex');
      }
    } else {
      folder.shareToken = null;
    }

    folder.updatedAt = new Date();
    await folder.save();

    res.json({
      message: `Folder is now ${folder.isPublic ? 'public' : 'private'}`,
      folder
    });
  } catch (error) {
    console.error('Toggle folder visibility error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get public folder contents (no auth required)
exports.getPublicFolder = async (req, res) => {
  try {
    const { shareToken } = req.params;

    const folder = await Folder.findOne({ shareToken, isPublic: true, isTrashed: false })
      .populate('userId', 'name email');

    if (!folder) {
      return res.status(404).json({ message: 'Public folder not found or link has been revoked' });
    }

    const files = await File.find({ folderId: folder._id, isTrashed: false }).select('-filePath');
    const subfolders = await Folder.find({ parentId: folder._id, isTrashed: false });

    res.json({
      folder: {
        _id: folder._id,
        name: folder.name,
        owner: folder.userId?.name || 'Drive User',
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        isPublic: folder.isPublic,
        shareToken: folder.shareToken
      },
      files,
      subfolders
    });
  } catch (error) {
    console.error('Get public folder error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Download a file from a public folder (no auth required)
exports.downloadPublicFolderFile = async (req, res) => {
  try {
    const { shareToken, fileId } = req.params;

    const folder = await Folder.findOne({ shareToken, isPublic: true, isTrashed: false });
    if (!folder) {
      return res.status(404).json({ message: 'Public folder not found or access revoked' });
    }

    const file = await File.findOne({ _id: fileId, folderId: folder._id, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: 'File not found in this public folder' });
    }

    return storageService.streamFile(file, res, 'attachment');
  } catch (error) {
    console.error('Download public folder file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete folder
exports.deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;

    const folder = await Folder.findOne({ _id: folderId, userId, isTrashed: false });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Check if folder has subfolders or files
    const subfolders = await Folder.find({ parentId: folderId, userId, isTrashed: false });
    const files = await File.find({ folderId, userId, isTrashed: false });

    if (subfolders.length > 0 || files.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete folder with subfolders or files. Please empty the folder first.'
      });
    }

    await Folder.findByIdAndDelete(folderId);
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
