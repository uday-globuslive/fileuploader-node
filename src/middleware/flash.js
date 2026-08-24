// Simple one-shot flash messages stored in the session.
function flashMiddleware(req, res, next) {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;

  res.setFlash = (type, message) => {
    req.session.flash = { type, message };
  };
  next();
}

module.exports = { flashMiddleware };
