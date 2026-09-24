const multer = require("multer");

// Files are kept in memory, validated (real bytes, not just the MIME type) and
// then handed to services/storage.js which writes them to disk or Cloudinary.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per image
    files: 10,
  },
  fileFilter,
});

module.exports = upload;
