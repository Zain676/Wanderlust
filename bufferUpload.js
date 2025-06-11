// middleware/bufferUpload.js
const multer = require('multer');
const storage = multer.memoryStorage(); // Store in memory first

module.exports = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});