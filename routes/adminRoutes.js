const express = require('express');
const {
  getAdminStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getReports,
  // Import feedback controllers (you need to create these)
  getAllFeedback,
  getFeedbackById,
  deleteFeedback,
  markFeedbackAsRead,
  replyToFeedback
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All admin routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// Stats and Reports
router.get('/stats', getAdminStats);
router.get('/reports', getReports);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Feedback Management (add these routes)
router.get('/feedback', getAllFeedback);
router.get('/feedback/:id', getFeedbackById);
router.delete('/feedback/:id', deleteFeedback);
router.patch('/feedback/:id/read', markFeedbackAsRead);
router.post('/feedback/:id/reply', replyToFeedback);

module.exports = router;