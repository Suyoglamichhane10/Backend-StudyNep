const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

console.log("GMAIL_USER:", process.env.GMAIL_USER);
console.log("APP_PASSWORD:", process.env.GMAIL_APP_PASSWORD ? "Loaded" : "Missing");

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

const getMailTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
});

const forgotPassword = async (req, res) => {
  const message = 'If an account exists for that email, a password reset link has been sent.';
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires');
    if (!user) return res.json({ message });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;
    try {
      console.log("Starting email send...");
      console.log("To:", user.email);
      await getMailTransporter().sendMail({
        from: process.env.MAIL_FROM || `StudyNep <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: 'Reset your StudyNep password',
        text: `You requested a password reset. Open this link to set a new password: ${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
        html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Set a new StudyNep password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`
      });
    } catch (mailError) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error('Password reset email failed:', mailError.message);
      return res.status(500).json({ message: 'Unable to send the reset email. Please try again later.' });
    }
    res.json({ message });
  } catch (error) {
    res.status(500).json({ message: 'Unable to process the password reset request' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters long' });

    const passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetToken, passwordResetExpires: { $gt: Date.now() } })
      .select('+password +passwordResetToken +passwordResetExpires');
    if (!user) return res.status(400).json({ message: 'This reset link is invalid or has expired' });

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to reset password' });
  }
};

module.exports = { register, login, getMe, logout, forgotPassword, resetPassword };
