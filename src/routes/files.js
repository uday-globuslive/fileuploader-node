const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const FileRecord = require('../models/FileRecord');
const { requireLogin, requireActive } = require('../middleware/auth');
const { verifyCsrfToken, isValidCsrfToken } = require('../middleware/csrf');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename: (req, file, cb) => {
    // Random filename on disk; the user-supplied name is only ever stored
    // as metadata and rendered through an auto-escaping template.
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes, files: config.maxUploadFiles },
});

function formatSize(bytes) {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb % 1 === 0 ? gb : gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb % 1 === 0 ? mb : mb.toFixed(1)} MB`;
}

function uploadErrorMessage(err) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return `One of your files is too large. Each file must be ${formatSize(config.maxUploadBytes)} or smaller.`;
  }
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
    return `You can upload at most ${config.maxUploadFiles} files at a time.`;
  }
  return err.message || 'Upload failed.';
}

router.get('/dashboard', requireLogin, requireActive, (req, res) => {
  const files = FileRecord.findByOwner(req.user.id).sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  res.render('dashboard', {
    title: 'My Files',
    files,
    maxUploadFiles: config.maxUploadFiles,
    maxUploadSize: formatSize(config.maxUploadBytes),
  });
});

router.post('/upload', requireLogin, requireActive, (req, res) => {
  // multipart/form-data bodies aren't parsed yet at this point, so the CSRF
  // token (which lives in that body) can only be checked once multer has run.
  upload.array('files', config.maxUploadFiles)(req, res, (err) => {
    if (err) {
      res.setFlash('error', uploadErrorMessage(err));
      return res.redirect('/dashboard');
    }

    if (!isValidCsrfToken(req)) {
      (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(403).send('Invalid or missing CSRF token');
    }

    if (!req.files || !req.files.length) {
      res.setFlash('error', 'Please choose at least one file to upload.');
      return res.redirect('/dashboard');
    }

    req.files.forEach((file) => {
      FileRecord.create({
        ownerId: req.user.id,
        originalName: file.originalname,
        storedName: file.filename,
        size: file.size,
        mimeType: file.mimetype,
      });
    });

    res.setFlash('success', `${req.files.length} file(s) uploaded successfully.`);
    res.redirect('/dashboard');
  });
});

router.get('/download/:id', requireLogin, requireActive, (req, res) => {
  const record = FileRecord.findById(req.params.id);
  if (!record || (record.ownerId !== req.user.id && !req.user.isAdmin)) {
    return res.status(404).send('File not found');
  }

  const filePath = path.join(config.uploadDir, record.storedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.download(filePath, record.originalName);
});

router.post('/delete/:id', requireLogin, requireActive, verifyCsrfToken, (req, res) => {
  const record = FileRecord.findById(req.params.id);
  if (!record || (record.ownerId !== req.user.id && !req.user.isAdmin)) {
    return res.status(404).send('File not found');
  }

  const filePath = path.join(config.uploadDir, record.storedName);
  fs.unlink(filePath, () => {});
  FileRecord.remove(record.id);

  res.setFlash('success', 'File deleted.');
  res.redirect('/dashboard');
});

module.exports = router;
