const User = require('../models/User');

// Loads the logged-in user (if any) onto req.user for every request.
function loadUser(req, res, next) {
  req.user = null;
  if (req.session && req.session.userId) {
    const user = User.findById(req.session.userId);
    if (user) {
      req.user = user;
    } else {
      // Stale session pointing at a deleted user.
      req.session.destroy(() => {});
    }
  }
  res.locals.currentUser = req.user;
  next();
}

function requireLogin(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }
  next();
}

function requireActive(req, res, next) {
  if (!req.user.isActive) {
    return res.status(403).render('pending', { title: 'Account pending approval' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).send('Forbidden');
  }
  next();
}

function redirectIfLoggedIn(req, res, next) {
  if (req.user) {
    return res.redirect('/dashboard');
  }
  next();
}

module.exports = { loadUser, requireLogin, requireActive, requireAdmin, redirectIfLoggedIn };
