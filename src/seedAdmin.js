const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('./config');
const User = require('./models/User');

// Creates the default admin account on first run only. Never overwrites an
// existing admin. If no password is configured, a random one is generated
// and printed once so it can never be recovered from source/config later.
function seedAdmin() {
  if (User.countAdmins() > 0) return;

  let password = config.adminPassword;
  let generated = false;
  if (!password) {
    password = crypto.randomBytes(12).toString('base64url');
    generated = true;
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  User.create({
    username: config.adminUsername,
    email: config.adminEmail,
    passwordHash,
    isAdmin: true,
    isActive: true,
  });

  console.log('='.repeat(60));
  console.log('Default admin account created.');
  console.log(`  Username: ${config.adminUsername}`);
  if (generated) {
    console.log(`  Password: ${password}  (generated - copy this now, it will not be shown again)`);
  } else {
    console.log('  Password: <value from ADMIN_PASSWORD env var>');
  }
  console.log('='.repeat(60));
}

module.exports = { seedAdmin };
