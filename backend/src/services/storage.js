const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { cloudinary, isConfigured } = require("../config/cloudinary");

// ======================================
// Image storage
//   - Cloudinary when CLOUDINARY_* is configured in .env
//   - otherwise the local disk: backend/uploads/<folder>/<random>.<ext>
//     (served publicly by the API under /uploads)
//
// Stored values:
//   url : "/uploads/products/abc.jpg"  (local)  |  "https://res.cloudinary..." (cloud)
//   key : "local:products/abc.jpg"     |  "cloud:al-dalouaa/products/xyz"
// ======================================

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// Never trust the browser's MIME type / file name - look at the real bytes.
const sniffImageExtension = (buffer) => {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") return "webp";
  if (["GIF87a", "GIF89a"].includes(buffer.slice(0, 6).toString("ascii"))) return "gif";
  return null;
};

const uploadImage = async (file, folder) => {
  if (!file) return null;

  const extension = sniffImageExtension(file.buffer);
  if (!extension) {
    throw httpError(400, "Only JPG, PNG, WEBP or GIF images are allowed");
  }

  if (isConfigured) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `al-dalouaa/${folder}`,
          resource_type: "image",
          transformation: [{ width: 1600, height: 2000, crop: "limit", quality: "auto", fetch_format: "auto" }],
        },
        (error, uploaded) => (error ? reject(error) : resolve(uploaded))
      );
      stream.end(file.buffer);
    });

    return { url: result.secure_url, key: `cloud:${result.public_id}` };
  }

  const directory = path.join(UPLOADS_DIR, folder);
  await fs.promises.mkdir(directory, { recursive: true });

  const fileName = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}.${extension}`;
  await fs.promises.writeFile(path.join(directory, fileName), file.buffer);

  return { url: `/uploads/${folder}/${fileName}`, key: `local:${folder}/${fileName}` };
};

// Best effort: a failed cleanup must never break the request.
const deleteImage = async (key) => {
  if (!key) return;

  try {
    if (key.startsWith("cloud:") && isConfigured) {
      await cloudinary.uploader.destroy(key.slice(6));
    } else if (key.startsWith("local:")) {
      const relative = key.slice(6);
      const target = path.resolve(UPLOADS_DIR, relative);
      // stay inside the uploads folder
      if (target.startsWith(UPLOADS_DIR + path.sep)) {
        await fs.promises.unlink(target);
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Could not delete image:", key, error.message);
  }
};

// Local files can be located from their public URL (used for category images,
// which only store the URL).
const keyFromUrl = (url) =>
  typeof url === "string" && url.startsWith("/uploads/") ? `local:${url.slice("/uploads/".length)}` : null;

module.exports = { uploadImage, deleteImage, keyFromUrl, UPLOADS_DIR, isCloudinary: isConfigured };
