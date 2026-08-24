const fs = require('fs');
const path = require('path');
const { dataDir } = require('./config');

const USERS_FILE = path.join(dataDir, 'users.json');
const FILES_FILE = path.join(dataDir, 'files.json');

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf8');
  if (!fs.existsSync(FILES_FILE)) fs.writeFileSync(FILES_FILE, '[]', 'utf8');
}

// All reads/writes below are synchronous on purpose: Node is single-threaded
// and sync fs calls block the event loop for the duration of the call, so a
// read-modify-write sequence executed without an `await` in between cannot be
// interleaved by another request. This keeps the JSON store consistent
// without needing a separate locking mechanism for this app's scale.

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function readFiles() {
  return JSON.parse(fs.readFileSync(FILES_FILE, 'utf8'));
}

function writeFiles(files) {
  fs.writeFileSync(FILES_FILE, JSON.stringify(files, null, 2), 'utf8');
}

module.exports = { ensureStore, readUsers, writeUsers, readFiles, writeFiles };
