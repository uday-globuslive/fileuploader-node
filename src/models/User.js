const { v4: uuidv4 } = require('uuid');
const { readUsers, writeUsers } = require('../db');

function findAll() {
  return readUsers();
}

function findById(id) {
  return readUsers().find((u) => u.id === id) || null;
}

function findByUsername(username) {
  const lower = String(username).toLowerCase();
  return readUsers().find((u) => u.username.toLowerCase() === lower) || null;
}

function findByEmail(email) {
  const lower = String(email).toLowerCase();
  return readUsers().find((u) => u.email.toLowerCase() === lower) || null;
}

function create({ username, email, passwordHash, isAdmin = false, isActive = false }) {
  const users = readUsers();
  const user = {
    id: uuidv4(),
    username,
    email,
    passwordHash,
    isAdmin,
    isActive,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);
  return user;
}

function update(id, patch) {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...patch };
  writeUsers(users);
  return users[idx];
}

function remove(id) {
  const users = readUsers();
  const next = users.filter((u) => u.id !== id);
  writeUsers(next);
  return next.length !== users.length;
}

function countAdmins() {
  return readUsers().filter((u) => u.isAdmin).length;
}

module.exports = { findAll, findById, findByUsername, findByEmail, create, update, remove, countAdmins };
