const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('=== Authorize Debug ===');
    console.log('User role from token:', req.user?.role);
    console.log('Allowed roles:', roles);
    console.log('User object:', req.user)
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Role ${req.user.role} not authorized` });
    }
    next();
  };
};

module.exports = { protect, authorize };