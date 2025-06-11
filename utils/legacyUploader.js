// utils/legacyUploader.js
const cloudinary = require('cloudinary').v2;

module.exports = async (filePath) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, 
      {
        resource_type: 'auto',
        timeout: 60000 // 60s timeout
      }, 
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
  });
};