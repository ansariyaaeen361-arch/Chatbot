const User = require('../models/User');

// Must run after `auth`. Re-checks verification status from the DB (not the
// JWT, which never reflects a later verification) and blocks unverified
// accounts from dashboard actions — mirrors the frontend's ProtectedRoute
// redirect, but actually enforced server-side instead of being bypassable
// via a direct API call.
module.exports = async function requireVerified(req, res, next) {
  const user = await User.findById(req.user.userId).select('isVerified');
  if (!user) return res.status(401).json({ error: 'User not found' });
  if (!user.isVerified) {
    return res.status(403).json({ error: 'Please verify your email before continuing.' });
  }
  next();
};
