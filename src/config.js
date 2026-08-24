require('dotenv').config();
const path = require('path');

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  isProd: process.env.NODE_ENV === 'production',
  sessionSecret: process.env.SESSION_SECRET,
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  maxUploadBytes: parseInt(process.env.MAX_UPLOAD_BYTES, 10) || 20 * 1024 * 1024,
  uploadDir: path.join(__dirname, '..', 'uploads'),
  dataDir: path.join(__dirname, '..', 'data'),
};
