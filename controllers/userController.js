const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update common fields
    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    user.address = req.body.address || user.address;
    user.bio = req.body.bio || user.bio;
    user.avatar = req.body.avatar || user.avatar;
    
    if (req.body.dateOfBirth) {
      user.dateOfBirth = new Date(req.body.dateOfBirth);
    }

    // Update role-specific fields
    if (user.role === 'student') {
      user.studentId = req.body.studentId || user.studentId;
      user.semester = req.body.semester || user.semester;
      user.batch = req.body.batch || user.batch;
      user.department = req.body.department || user.department;
    } else if (user.role === 'teacher') {
      user.teacherId = req.body.teacherId || user.teacherId;
      user.qualification = req.body.qualification || user.qualification;
      user.department = req.body.department || user.department;
    }

    user.updatedAt = Date.now();
    await user.save();

    const updatedUser = await User.findById(req.user._id).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Upload avatar
// @route   POST /api/users/avatar
// @access  Private
const uploadAvatar = async (req, res) => {
  try {
    console.log('Avatar upload request received', {
      userId: req.user._id,
      hasFile: !!req.file,
      fileName: req.file?.filename,
      fileSize: req.file?.size,
      fileMimetype: req.file?.mimetype
    });

    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Construct avatar URL - use relative path for better portability
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    console.log('Updating user avatar:', { userId: req.user._id, avatarUrl });
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarUrl, updatedAt: Date.now() },
      { new: true }
    ).select('-password');

    if (!user) {
      console.error('User not found after update:', req.user._id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('Avatar updated successfully');

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: user
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Change password
// @route   POST /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const stats = {
      totalStudyHours: user.totalStudyHours || 0,
      streak: user.streak || 0,
      level: user.level || 'Beginner',
      memberSince: user.createdAt,
      lastActive: user.lastActive,
      role: user.role,
      totalNotes: 0, // You can populate this from Notes model
      totalQuizzes: 0, // You can populate this from QuizResults model
      averageScore: 0 // You can populate this from QuizResults model
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update study hours (from focus timer)
// @route   POST /api/users/study-hours
// @access  Private
const updateStudyHours = async (req, res) => {
  try {
    const { hours } = req.body;

    if (!hours || hours <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid hours value is required'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        $inc: { totalStudyHours: hours },
        lastActive: Date.now(),
        updatedAt: Date.now()
      },
      { new: true }
    ).select('-password');

    // Update streak
    const today = new Date().toDateString();
    const lastActive = new Date(user.lastActive).toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    let newStreak = user.streak;
    if (lastActive === yesterday) {
      newStreak += 1;
      await User.findByIdAndUpdate(req.user._id, { streak: newStreak });
    } else if (lastActive !== today) {
      newStreak = 1;
      await User.findByIdAndUpdate(req.user._id, { streak: newStreak });
    }

    res.status(200).json({
      success: true,
      message: 'Study hours updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  getUserStats,
  updateStudyHours
};