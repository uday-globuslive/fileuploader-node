const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const User = require('../models/User');
const FileRecord = require('../models/FileRecord');
const { requireLogin, requireAdmin } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');

const router = express.Router();

router.get('/admin', requireLogin, requireAdmin, (req, res) => {
  const users = User.findAll()
    .map((u) => ({ ...u, passwordHash: undefined }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.render('admin', { title: 'Admin - Manage users', users });
});

router.post('/admin/users/:id/toggle-active', requireLogin, requireAdmin, verifyCsrfToken, (req, res) => {
  const target = User.findById(req.params.id);
  if (!target) return res.status(404).send('User not found');

  if (target.id === req.user.id) {
    res.setFlash('error', 'You cannot change your own active status.');
    return res.redirect('/admin');
  }

  User.update(target.id, { isActive: !target.isActive });
  res.setFlash('success', `${target.username} is now ${!target.isActive ? 'active' : 'inactive'}.`);
  res.redirect('/admin');
});

router.post('/admin/users/:id/toggle-admin', requireLogin, requireAdmin, verifyCsrfToken, (req, res) => {
  const target = User.findById(req.params.id);
  if (!target) return res.status(404).send('User not found');

  if (target.id === req.user.id) {
    res.setFlash('error', 'You cannot change your own admin status.');
    return res.redirect('/admin');
  }

  if (target.isAdmin && User.countAdmins() <= 1) {
    res.setFlash('error', 'At least one admin must remain.');
    return res.redirect('/admin');
  }

  User.update(target.id, { isAdmin: !target.isAdmin });
  res.setFlash('success', `${target.username} admin rights ${!target.isAdmin ? 'granted' : 'revoked'}.`);
  res.redirect('/admin');
});

router.post('/admin/users/:id/delete', requireLogin, requireAdmin, verifyCsrfToken, (req, res) => {
  const target = User.findById(req.params.id);
  if (!target) return res.status(404).send('User not found');

  if (target.id === req.user.id) {
    res.setFlash('error', 'You cannot delete your own account.');
    return res.redirect('/admin');
  }

  if (target.isAdmin && User.countAdmins() <= 1) {
    res.setFlash('error', 'At least one admin must remain.');
    return res.redirect('/admin');
  }

  const removedFiles = FileRecord.removeByOwner(target.id);
  removedFiles.forEach((f) => fs.unlink(path.join(config.uploadDir, f.storedName), () => {}));

  User.remove(target.id);
  res.setFlash('success', `${target.username} was deleted.`);
  res.redirect('/admin');
});

module.exports = router;
