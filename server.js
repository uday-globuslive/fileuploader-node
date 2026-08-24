const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const crypto = require('crypto');
const config = require('./src/config');
const { ensureStore } = require('./src/db');
const { seedAdmin } = require('./src/seedAdmin');
const { loadUser } = require('./src/middleware/auth');
const { attachCsrfToken } = require('./src/middleware/csrf');
const { flashMiddleware } = require('./src/middleware/flash');
const authRoutes = require('./src/routes/auth');
const fileRoutes = require('./src/routes/files');
const adminRoutes = require('./src/routes/admin');

if (!config.sessionSecret) {
  console.error('SESSION_SECRET is not set. Copy .env.example to .env and set a long random value.');
  process.exit(1);
}

ensureStore();
seedAdmin();

const app = express();
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    name: 'sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProd,
      maxAge: 1000 * 60 * 60 * 4, // 4 hours
    },
  })
);

app.use(loadUser);
app.use(attachCsrfToken);
app.use(flashMiddleware);

app.get('/', (req, res) => res.redirect(req.user ? '/dashboard' : '/login'));

app.use(authRoutes);
app.use(fileRoutes);
app.use(adminRoutes);

app.use((req, res) => res.status(404).render('404', { title: 'Not found' }));

// Multer/other errors that reach here.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Something went wrong.');
});

const server = app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});

// Large uploads (up to MAX_UPLOAD_BYTES) can take longer than Node's default
// 5-minute request timeout on slow connections; disable it so transfers
// aren't cut off mid-upload. Header-only timeout stays short to still guard
// against slow-header DoS attempts.
server.requestTimeout = 0;
server.headersTimeout = 60_000;
