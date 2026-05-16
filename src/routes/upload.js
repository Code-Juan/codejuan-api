const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const env = require('../config/env');
const fs = require('fs');
const { isConfigured: isDriveConfigured, uploadFile: uploadToDrive } = require('../services/googleDrive');

const useGoogleDrive = isDriveConfigured();

// File filter for allowed types
const allowedTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/plain', 'text/csv',
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`));
  }
};

// When using Google Drive: store in memory
const memoryStorage = multer.memoryStorage();

// When using local disk: store on filesystem
const uploadDir = env.uploadDir;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const clientDir = path.join(uploadDir, req.params.clientId || 'general');
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }
    cb(null, clientDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage: useGoogleDrive ? memoryStorage : diskStorage,
  limits: { fileSize: env.maxFileSize },
  fileFilter,
});

// POST /api/upload/:clientId -- upload a file
router.post('/:clientId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const { clientId } = req.params;
    let storedName, uploadPath;

    if (useGoogleDrive) {
      const result = await uploadToDrive(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        clientId
      );
      storedName = result.storedName;
      uploadPath = result.fileId;
    } else {
      storedName = req.file.filename;
      uploadPath = req.file.path;
    }

    await pool.query(
      `INSERT INTO uploads (client_id, original_name, stored_name, mime_type, size_bytes, upload_path)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [clientId, req.file.originalname, storedName, req.file.mimetype, req.file.size, uploadPath]
    );

    res.json({
      success: true,
      file: {
        originalName: req.file.originalname,
        storedName,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (err) {
    console.error('upload error:', err);
    res.status(500).json({ error: 'File upload failed.' });
  }
});

module.exports = router;
