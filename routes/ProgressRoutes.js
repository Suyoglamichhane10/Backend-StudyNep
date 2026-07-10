const express = require('express');
const {
  // Main
  getProgress,
  getDashboardStats,
  
  // Weekly
  getWeeklyProgress,
  
  // Performance
  getPerformanceData,
  getSimplePerformanceData,
  
  // Activities
  getActivities,
  
  // Streak
  getStudyStreak,
  updateStreak,
  
  // Achievements
  getAchievements,
  
  // Subject Progress
  getAllSubjectsProgress,
  getSubjectProgressById,
  
  // Goals
  getStudyGoal,
  setStudyGoal,
  
  // Study Logging
  logStudySession,
  
  // Quiz
  submitQuizScore,
  getQuizScores,
  
  // Export
  exportProgressData,
} = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// ==================== Main Endpoints ====================
router.get('/', getProgress);
router.get('/stats', getDashboardStats);

// ==================== Progress Tracking ====================
router.get('/weekly', getWeeklyProgress);
router.get('/performance', getPerformanceData);
router.get('/performance/simple', getSimplePerformanceData);
router.get('/activities', getActivities);
router.get('/streak', getStudyStreak);
router.put('/streak', updateStreak);
router.get('/achievements', getAchievements);

// ==================== Subject Progress ====================
router.get('/subjects', getAllSubjectsProgress);
router.get('/subject/:subjectId', getSubjectProgressById);

// ==================== Goals ====================
router.get('/goal', getStudyGoal);
router.post('/goal', setStudyGoal);

// ==================== Study Logging ====================
router.post('/study', logStudySession);
router.post('/', logStudySession); // Alias

// ==================== Quiz ====================
router.get('/quiz', getQuizScores);
router.post('/quiz', submitQuizScore);

// ==================== Export ====================
router.get('/export', exportProgressData);

module.exports = router;