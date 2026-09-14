const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Builds a disk-storage multer instance scoped to a subfolder
// (uploads/trade or uploads/market) with a max file count + 5MB/file limit.
function makeUploader(subfolder, maxCount) {
  const dest = path.join(__dirname, '..', '..', 'uploads', subfolder);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, unique);
    },
  });

  const fileFilter = (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const okExt = allowed.test(path.extname(file.originalname).toLowerCase());
    const okMime = allowed.test(file.mimetype);
    if (okExt && okMime) return cb(null, true);
    cb(new Error('Only JPG, PNG or WEBP images are allowed'));
  };

  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: maxCount }, // 5MB per file
  });

  return {
    array: (fieldName) => upload.array(fieldName, maxCount),
    relativeDir: `/uploads/${subfolder}`,
  };
}

// Trade posts: "You can add up to 5 photos"
const tradeUpload = makeUploader('trade', 5);
// Market ads: "Select up to 4 photos"
const marketUpload = makeUploader('market', 4);

module.exports = { tradeUpload, marketUpload };
