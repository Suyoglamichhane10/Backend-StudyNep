const express = require('express');
const {
  getTeacherDashboard,
  getStudents,
} = require('../controllers/teacherController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// ✅ Allow both 'teacher' and 'admin' roles
router.get('/dashboard', protect, authorize('teacher', 'admin'), getTeacherDashboard);
router.get('/students', protect, authorize('teacher', 'admin'), getStudents);

module.exports = router;