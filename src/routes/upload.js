const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const env = require('../config/env');
const fs = require('fs');

//ensure upload directory exists
const uploadDir = env.uploadDir;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

//multer storage configuration
const storage = multer.diskStorage({
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
  storage,
  limits: { fileSize: env.maxFileSize },
  fileFilter: (req, file, cb) => {
    //allow common web file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'text/plain', 'text/csv',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

//POST /api/upload/:clientId -- upload a file
router.post('/:clientId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const { clientId } = req.params;

    await pool.query(
      `INSERT INTO uploads (client_id, original_name, stored_name, mime_type, size_bytes, upload_path)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [clientId, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.file.path]
    );

    res.json({
      success: true,
      file: {
        originalName: req.file.originalname,
        storedName: req.file.filename,
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
