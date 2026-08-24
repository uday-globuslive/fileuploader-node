const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { redirectIfLoggedIn } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again later.',
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many registration attempts. Please try again later.',
});

router.get('/login', redirectIfLoggedIn, (req, res) => {
  res.render('login', { title: 'Login', errors: [] });
});

router.post(
  '/login',
  loginLimiter,
  verifyCsrfToken,
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  (req, res) => {
    console.log('[login] handler reached');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('login', { title: 'Login', errors: errors.array() });
    }

    const { username, password } = req.body;
    const user = User.findByUsername(username);
    console.log('[login] user lookup done, found:', !!user);
    const genericError = 'Invalid username or password.';

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      console.log('[login] password check failed');
      return res.status(401).render('login', { title: 'Login', errors: [{ msg: genericError }] });
    }
    console.log('[login] password check passed');

    if (!user.isActive) {
      return res
        .status(403)
        .render('login', { title: 'Login', errors: [{ msg: 'Your account is pending admin approval.' }] });
    }

    // Regenerate the session on privilege change to prevent session fixation.
    req.session.regenerate((err) => {
      if (err) {
        console.log('[login] session.regenerate error:', err);
        return res.status(500).send('Login failed');
      }
      req.session.userId = user.id;
      console.log('[login] session regenerated, redirecting to /dashboard');
      res.redirect('/dashboard');
    });
  }
);

router.get('/register', redirectIfLoggedIn, (req, res) => {
  res.render('register', { title: 'Register', errors: [], values: {} });
});

router.post(
  '/register',
  registerLimiter,
  verifyCsrfToken,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 32 })
      .withMessage('Username must be 3-32 characters')
      .matches(/^[a-zA-Z0-9_.-]+$/)
      .withMessage('Username may only contain letters, numbers, dot, dash and underscore'),
    body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    const values = { username: req.body.username || '', email: req.body.email || '' };

    if (!errors.isEmpty()) {
      return res.status(400).render('register', { title: 'Register', errors: errors.array(), values });
    }

    const { username, email, password } = req.body;
    if (User.findByUsername(username) || User.findByEmail(email)) {
      return res
        .status(409)
        .render('register', { title: 'Register', errors: [{ msg: 'Username or email already in use.' }], values });
    }

    const passwordHash = bcrypt.hashSync(password, 12);
    User.create({ username, email, passwordHash, isAdmin: false, isActive: false });

    res.setFlash('success', 'Registration successful. An administrator must activate your account before you can log in.');
    res.redirect('/login');
  }
);

router.post('/logout', verifyCsrfToken, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
