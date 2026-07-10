const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

const register = async (req, res) => {
  try {
    const { name, email, password, role, level } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ name, email, password, role: role || 'student', level });
    res.status(201).json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, level: user.level, streak: user.streak,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (user && await user.matchPassword(password)) {
      user.lastActive = Date.now();
      await user.save();
      res.json({
        _id: user._id, name: user.name, email: user.email,
        role: user.role, level: user.level, streak: user.streak,
        totalStudyHours: user.totalStudyHours,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  res.json(req.user);
};

const logout = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

module.exports = { register, login, getMe, logout };