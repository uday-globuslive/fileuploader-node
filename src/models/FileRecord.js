const { v4: uuidv4 } = require('uuid');
const { readFiles, writeFiles } = require('../db');

function findAll() {
  return readFiles();
}

function findById(id) {
  return readFiles().find((f) => f.id === id) || null;
}

function findByOwner(ownerId) {
  return readFiles().filter((f) => f.ownerId === ownerId);
}

function create({ ownerId, originalName, storedName, size, mimeType }) {
  const files = readFiles();
  const record = {
    id: uuidv4(),
    ownerId,
    originalName,
    storedName,
    size,
    mimeType,
    uploadedAt: new Date().toISOString(),
  };
  files.push(record);
  writeFiles(files);
  return record;
}

function remove(id) {
  const files = readFiles();
  const next = files.filter((f) => f.id !== id);
  writeFiles(next);
  return next.length !== files.length;
}

function removeByOwner(ownerId) {
  const files = readFiles();
  const kept = files.filter((f) => f.ownerId !== ownerId);
  const removed = files.filter((f) => f.ownerId === ownerId);
  writeFiles(kept);
  return removed;
}

module.exports = { findAll, findById, findByOwner, create, remove, removeByOwner };
