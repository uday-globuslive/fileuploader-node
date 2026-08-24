const crypto = require('crypto');

// Generates/reuses a per-session CSRF token and exposes it to views.
function attachCsrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function isValidCsrfToken(req) {
  const sessionToken = req.session.csrfToken;
  const submitted = req.body && req.body._csrf;

  return (
    typeof sessionToken === 'string' &&
    typeof submitted === 'string' &&
    sessionToken.length === submitted.length &&
    crypto.timingSafeEqual(Buffer.from(sessionToken), Buffer.from(submitted))
  );
}

function verifyCsrfToken(req, res, next) {
  if (!isValidCsrfToken(req)) {
    return res.status(403).send('Invalid or missing CSRF token');
  }
  next();
}

module.exports = { attachCsrfToken, verifyCsrfToken, isValidCsrfToken };

