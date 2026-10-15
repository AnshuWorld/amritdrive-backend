const crypto = require('crypto');
const File = require('../models/File');
const fs = require('fs');
const path = require('path');
const storageService = require('../services/storageService');
const ShareLink = require('../models/ShareLink');
const { validationResult } = require('express-validator');
const { pickValidOrigin } = require('../config/clientOrigins');

// Generate share link
exports.generateShareLink = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation Errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { fileId, expiresIn, password, permission } = req.body;
    const userId = req.user.id;

    const file = await File.findOne({ _id: fileId, userId, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Generate the token here, before creating the ShareLink object.
    const token = crypto.randomBytes(32).toString('hex');

    const share = new ShareLink({
      token,
      file: fileId,
      owner: userId,
      permission: permission === 'editor' ? 'editor' : 'viewer',
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null,
      password: password || null,
    });

    await share.save();

    res.status(201).json({
      message: 'Share link generated successfully',
      token: share.token,
      permission: share.permission
    });
  } catch (error) {
    console.error('Generate share link error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Provides file metadata & permissions to the frontend share page.
exports.getShareInfo = async (req, res) => {
  try {
    const { token } = req.params;
    const share = await ShareLink.findOne({ token, isActive: true })
      .populate('file', 'name size mimetype description updatedAt')
      .populate('owner', 'name email');

    if (!share || (share.expiresAt && new Date() > share.expiresAt)) {
      if (share) {
        share.isActive = false;
        await share.save();
      }
      return res.status(404).json({ message: 'Share link not found or has expired' });
    }

    if (!share.file) {
      return res.status(404).json({ message: 'The linked file has been deleted.' });
    }

    res.json({
      file: {
        id: share.file._id,
        name: share.file.name,
        size: share.file.size,
        mimetype: share.file.mimetype,
        description: share.file.description || '',
        updatedAt: share.file.updatedAt
      },
      permission: share.permission || 'viewer',
      owner: share.owner ? { name: share.owner.name } : null,
      requiresPassword: !!share.password,
    });
  } catch (error) {
    console.error('Get share info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Edit shared file (Editor permission required)
exports.editSharedFile = async (req, res) => {
  try {
    const { token } = req.params;
    const { name, description, password } = req.body;

    const share = await ShareLink.findOne({ token, isActive: true }).populate('file');
    if (!share || (share.expiresAt && new Date() > share.expiresAt)) {
      if (share) {
        share.isActive = false;
        await share.save();
      }
      return res.status(404).json({ message: 'Share link not found or has expired' });
    }

    if (!share.file) {
      return res.status(404).json({ message: 'The linked file has been deleted.' });
    }

    // Verify password if protected
    const passwordMatch = await share.comparePassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid password. Password is required to make edits.' });
    }

    // Check permission
    if (share.permission !== 'editor') {
      return res.status(403).json({
        message: 'Forbidden: You have Viewer permission only. An Editor permission is required to modify this file.'
      });
    }

    // Update file
    const file = await File.findById(share.file._id);
    if (!file || file.isTrashed) {
      return res.status(404).json({ message: 'File is not available or has been moved to trash' });
    }

    if (name && name.trim()) {
      file.name = name.trim();
    }
    if (description !== undefined) {
      file.description = description;
    }
    file.updatedAt = new Date();
    await file.save();

    res.json({
      message: 'File updated successfully by editor',
      file: {
        id: file._id,
        name: file.name,
        description: file.description,
        updatedAt: file.updatedAt
      }
    });
  } catch (error) {
    console.error('Edit shared file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// It now correctly redirects the user to your frontend application.
exports.accessSharedFile = async (req, res) => {
  try {
    const { token } = req.params;
    const origin = pickValidOrigin(req.query?.redirect);
    return res.redirect(`${origin}/share/${token}`);
  } catch (error) {
    console.error('Share link redirect error:', error);
    return res.status(500).send('Error redirecting to the share page.');
  }
};

// Download shared file
exports.downloadSharedFile = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const share = await ShareLink.findOne({ token, isActive: true }).populate('file');

    if (!share || (share.expiresAt && new Date() > share.expiresAt)) {
      if (share) {
        share.isActive = false;
        await share.save();
      }
      return res.status(404).json({ message: 'Share link not found or expired' });
    }

    if (!share.file) {
      return res.status(404).json({ message: 'The original file for this link has been deleted.' });
    }

    const passwordMatch = await share.comparePassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    share.downloadCount = (share.downloadCount || 0) + 1;
    share.lastAccessedAt = new Date();
    await share.save();

    return storageService.streamFile(share.file, res, 'attachment');

  } catch (error) {
    console.error('Download shared file error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};

// Get user's share links
exports.getShareLinks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const sharesWithPotentialNulls = await ShareLink.find({ owner: userId })
      .populate('file', 'name size mimetype originalName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const shares = sharesWithPotentialNulls.filter(share => share.file !== null);
    const total = await ShareLink.countDocuments({ owner: userId });

    res.json({
      shares,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get share links error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Revoke share link
exports.revokeShareLink = async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.user.id;

    const share = await ShareLink.findOneAndDelete({ _id: shareId, owner: userId });
    if (!share) {
      return res.status(404).json({ message: 'Share link not found' });
    }

    res.json({ message: 'Share link revoked successfully' });
  } catch (error) {
    console.error('Revoke share link error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

