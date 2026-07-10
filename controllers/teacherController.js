const User = require('../models/User');
const Material = require('../models/Material');
const Feedback = require('../models/Feedback');

// @desc    Get teacher dashboard stats
// @route   GET /api/teacher/dashboard
// @access  Private/Teacher
const getTeacherDashboard = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const activeMaterials = await Material.countDocuments({ uploadedBy: req.user.id });
    const pendingFeedback = await Feedback.countDocuments({ teacher: req.user.id });

    // Recent activity (simplified)
    const recentActivity = []; // Could be aggregated from various sources

    res.json({
      totalStudents,
      activeMaterials,
      pendingFeedback,
      averagePerformance: 78, // Placeholder – compute from Progress model later
      recentActivity,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all students (for teacher)
// @route   GET /api/teacher/students
// @access  Private/Teacher
const getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTeacherDashboard, getStudents };