const jwt = require('jsonwebtoken');

// Like auth.js, but never rejects the request — just attaches req.user
// if a valid token is present, otherwise leaves it undefined (anonymous).
module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // invalid/expired token — treat as anonymous rather than failing the request
    }
  }
  next();
};
