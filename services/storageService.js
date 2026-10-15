const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { cloudinary, isConfigured: isCloudinaryConfigured } = require('../config/cloudinary');

/**
 * Resolve local file path across environments (absolute, relative, or userId folder)
 */
function resolveLocalFilePath(file) {
  if (!file || !file.filePath) return null;

  // 1. Check exact filePath if absolute
  if (path.isAbsolute(file.filePath) && fs.existsSync(file.filePath)) {
    return file.filePath;
  }

  const baseUploadDir = path.join(__dirname, '../uploads');
  const filename = path.basename(file.filePath);
  const userIdStr = file.userId ? file.userId.toString() : '';

  // 2. Check backend/uploads/<userId>/<filename>
  if (userIdStr) {
    const userPath = path.join(baseUploadDir, userIdStr, filename);
    if (fs.existsSync(userPath)) return userPath;
  }

  // 3. Check backend/uploads/<filename>
  const directPath = path.join(baseUploadDir, filename);
  if (fs.existsSync(directPath)) return directPath;

  // 4. If filePath was relative to backend directory
  const relativeToBackend = path.resolve(__dirname, '..', file.filePath);
  if (fs.existsSync(relativeToBackend)) return relativeToBackend;

  return null;
}

/**
 * Stream a remote URL to the express response with support for redirects
 */
function streamRemoteUrl(url, res) {
  const client = url.startsWith('http:') ? http : https;
  return new Promise((resolve, reject) => {
    client.get(url, (remoteStream) => {
      // Follow redirects if any (e.g., 301/302)
      if (remoteStream.statusCode === 301 || remoteStream.statusCode === 302) {
        if (remoteStream.headers.location) {
          return streamRemoteUrl(remoteStream.headers.location, res).then(resolve).catch(reject);
        }
      }

      if (remoteStream.statusCode >= 400) {
        if (!res.headersSent) {
          res.status(remoteStream.statusCode).json({ message: 'Error fetching file from cloud storage' });
        }
        return resolve();
      }

      remoteStream.pipe(res);
      remoteStream.on('end', resolve);
      remoteStream.on('error', (err) => {
        console.error('Remote stream pipe error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error streaming file from storage' });
        }
        reject(err);
      });
    }).on('error', (err) => {
      console.error('Remote HTTP get error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error connecting to storage server' });
      }
      reject(err);
    });
  });
}

/**
 * Upload a file to Cloudinary if configured, or keep on disk
 */
async function uploadFile(tempFilePath, originalName, mimetype, userId) {
  if (isCloudinaryConfigured()) {
    try {
      const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
        folder: `amrit_drive/${userId || 'common'}`,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        overwrite: false
      });

      // Remove temporary disk file once uploaded to cloud
      if (fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch (e) { console.warn('Could not remove temp file:', e.message); }
      }

      return {
        storageType: 'cloudinary',
        cloudinaryId: uploadResult.public_id,
        cloudinaryUrl: uploadResult.secure_url,
        resourceType: uploadResult.resource_type || 'auto',
        filePath: uploadResult.secure_url,
        size: uploadResult.bytes
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  // Fallback: Return local file details
  return {
    storageType: 'local',
    cloudinaryId: null,
    cloudinaryUrl: null,
    resourceType: 'auto',
    filePath: tempFilePath
  };
}

/**
 * Stream file to client for download or inline view
 */
function streamFile(file, res, disposition = 'attachment') {
  res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
  const safeFilename = encodeURIComponent(file.originalName || file.name || 'download');
  res.setHeader('Content-Disposition', `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
  if (file.size) {
    res.setHeader('Content-Length', file.size);
  }

  // 1. Cloudinary storage
  if (file.storageType === 'cloudinary' || (file.cloudinaryUrl && file.cloudinaryUrl.startsWith('http'))) {
    const url = file.cloudinaryUrl || file.filePath;
    return streamRemoteUrl(url, res);
  }

  // 2. Local disk fallback
  const localPath = resolveLocalFilePath(file);
  if (!localPath) {
    return res.status(404).json({
      message: 'File not found on disk. The file may have been uploaded prior to Cloudinary setup or cleared when the server restarted.'
    });
  }

  const fileStream = fs.createReadStream(localPath);
  fileStream.on('error', (error) => {
    console.error('Local file stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error reading file from disk' });
    }
  });

  fileStream.pipe(res);
}

/**
 * Delete a stored file (from Cloudinary or local disk)
 */
async function deleteStoredFile(file) {
  if (!file) return;

  if (file.cloudinaryId) {
    try {
      await cloudinary.uploader.destroy(file.cloudinaryId, {
        resource_type: file.resourceType || 'raw'
      });
      // Sometimes raw or video files might fail with default resource type, try 'image' if 'raw' fails
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error.message);
    }
  }

  // Also clean up any local copy if present
  const localPath = resolveLocalFilePath(file);
  if (localPath && fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch (e) {
      console.warn('Could not delete local file:', e.message);
    }
  }
}

module.exports = {
  isCloudinaryConfigured,
  resolveLocalFilePath,
  uploadFile,
  streamFile,
  deleteStoredFile
};
