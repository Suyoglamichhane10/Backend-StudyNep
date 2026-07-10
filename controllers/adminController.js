const User = require('../models/User');
const Material = require('../models/Material');
const Subject = require('../models/Subject');
const Feedback = require('../models/Feedback');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalMaterials = await Material.countDocuments();
    const totalSubjects = await Subject.countDocuments();
    const totalFeedback = await Feedback.countDocuments();

    res.json({
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAdmins,
      totalMaterials,
      totalSubjects,
      totalFeedback,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users (with optional role filter)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user role or other fields
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const { name, email, role, level } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.level = level || user.level;

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      level: updatedUser.level,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.deleteOne();
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get system reports (example: users by role, recent activity)
// @route   GET /api/admin/reports
// @access  Private/Admin
const getReports = async (req, res) => {
  try {
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt');

    const recentMaterials = await Material.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('uploadedBy', 'name');

    res.json({
      usersByRole,
      recentUsers,
      recentMaterials,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Add these to your existing adminController.js

// @desc    Get all feedback
// @route   GET /api/admin/feedback
// @access  Private/Admin
const getAllFeedback = async (req, res) => {
  try {
    // You need a Feedback model - create one if you don't have it
    const Feedback = require('../models/Feedback');
    const feedback = await Feedback.find()
      .populate('user', 'name email')
      .sort('-createdAt');
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single feedback by ID
// @route   GET /api/admin/feedback/:id
// @access  Private/Admin
const getFeedbackById = async (req, res) => {
  try {
    const Feedback = require('../models/Feedback');
    const feedback = await Feedback.findById(req.params.id)
      .populate('user', 'name email');
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete feedback
// @route   DELETE /api/admin/feedback/:id
// @access  Private/Admin
const deleteFeedback = async (req, res) => {
  try {
    const Feedback = require('../models/Feedback');
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    await feedback.deleteOne();
    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark feedback as read
// @route   PATCH /api/admin/feedback/:id/read
// @access  Private/Admin
const markFeedbackAsRead = async (req, res) => {
  try {
    const Feedback = require('../models/Feedback');
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    feedback.isRead = true;
    await feedback.save();
    
    res.json({ message: 'Feedback marked as read', feedback });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reply to feedback
// @route   POST /api/admin/feedback/:id/reply
// @access  Private/Admin
const replyToFeedback = async (req, res) => {
  try {
    const { reply } = req.body;
    
    if (!reply) {
      return res.status(400).json({ message: 'Reply message is required' });
    }
    
    const Feedback = require('../models/Feedback');
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    // Add reply to feedback (you might want to store replies)
    feedback.reply = {
      message: reply,
      repliedBy: req.user._id,
      repliedAt: new Date()
    };
    
    feedback.isRead = true;
    await feedback.save();
    
    res.json({ message: 'Reply sent successfully', feedback });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Make sure to export all functions
module.exports = {
  getAdminStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getReports,
  getAllFeedback,
  getFeedbackById,
  deleteFeedback,
  markFeedbackAsRead,
  replyToFeedback
};
