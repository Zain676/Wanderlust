const cloudinary = require("cloudinary").v1;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure with secure settings
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  secure: true // Force HTTPS
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "wanderlust",
      allowed_formats: ["png", "jpg", "jpeg"],
      transformation: [{ width: 800, crop: "scale" }],
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
    };
  }
});

module.exports = {
  cloudinary,
  storage
};