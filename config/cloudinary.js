const cloudinary = require('cloudinary').v2;

const isConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  console.log(' Cloudinary storage configured successfully.');
} else {
  console.warn('⚠️ Cloudinary credentials not fully set. Falling back to local disk storage.');
}

module.exports = {
  cloudinary,
  isConfigured
};
