const express = require('express');
const {
  getFeedbackForStudent,
  createFeedback,
  deleteFeedback,
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/student/:studentId', protect, getFeedbackForStudent);
router.post('/', protect, authorize('teacher'), createFeedback);
router.delete('/:id', protect, authorize('teacher'), deleteFeedback);

module.exports = router;