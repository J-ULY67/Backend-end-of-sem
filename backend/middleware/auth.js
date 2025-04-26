// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token provided' });

  const token = auth.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = decoded; // { userId, name, studentId, email, role }
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Admin only' });
  next();
}

module.exports = { verifyToken, isAdmin };