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
  let user = null;

  try {
    console.log('📩 forgotPassword called with body:', req.body);

    const email = req.body.email?.trim().toLowerCase();
    if (!email) {
      console.warn('⚠️ No email provided');
      return res.status(400).json({ message: 'Email is required' });
    }

    console.log(`🔍 Looking for user with email: ${email}`);
    user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires');
    if (!user) {
      console.log('❌ User not found, returning generic success');
      return res.json({ message });
    }
    console.log(`✅ User found: ${user.email}`);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    console.log('🔑 Generated raw reset token:', resetToken);
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    console.log('💾 Reset token saved to DB');

    // Build reset URL
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;
    console.log(`🔗 Reset URL: ${resetUrl}`);

    // --- Send email ---
    console.log('📧 Preparing to send email...');

    // Use explicit SMTP config (more reliable than 'service: gmail')
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    // Verify connection (throws if auth fails or network issues)
    console.log('🔌 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    const mailOptions = {
      from: process.env.MAIL_FROM || `StudyNep <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: 'Reset your StudyNep password',
      text: `You requested a password reset. Open this link to set a new password: ${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
      html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Set a new StudyNep password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully! Message ID:', info.messageId);

    res.json({ message });
  } catch (error) {
    // Clear reset tokens if something went wrong
    if (user) {
      try {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        console.log('🧹 Cleared reset tokens due to error');
      } catch (saveError) {
        console.error('❌ Error clearing tokens:', saveError.message);
      }
    }

    // LOG THE FULL ERROR with stack trace
    console.error('🔥 FULL ERROR in forgotPassword:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Stack:', error.stack);

    // Send a more informative response (but hide sensitive details in production)
    let errorMessage = 'Unable to send the reset email. Please try again later.';
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed – check your Gmail credentials.';
    } else if (error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
      errorMessage = 'Network error – unable to reach Gmail SMTP.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Timeout – Gmail SMTP took too long to respond.';
    }
    res.status(500).json({ message: errorMessage });
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
