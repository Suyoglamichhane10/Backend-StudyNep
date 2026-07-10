const express = require('express');
const {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  submitQuizAttempt,
  getUserAttempts,
  getAttemptDetails,
  getQuizStats,
  getTeacherQuizzes,
} = require('../controllers/quizController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// ✅ Specific routes must come before parameterized routes
router.get('/get', getQuizzes);               // GET /api/quiz/get
router.get('/attempts', getUserAttempts);     // GET /api/quiz/attempts
router.get('/attempts/:attemptId', getAttemptDetails);
router.get('/teacher/quizzes', authorize('teacher', 'admin'), getTeacherQuizzes);
router.get('/:id/stats', authorize('teacher', 'admin'), getQuizStats);
router.get('/:id', getQuizById);              // GET /api/quiz/:id – must be last

router.post('/', authorize('teacher', 'admin'), createQuiz);
router.post('/:id/attempt', submitQuizAttempt);
router.put('/:id', authorize('teacher', 'admin'), updateQuiz);
router.delete('/:id', authorize('teacher', 'admin'), deleteQuiz);

module.exports = router;