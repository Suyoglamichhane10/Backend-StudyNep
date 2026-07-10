const Progress = require('../models/Progress');
const Activity = require('../models/Activity');
const User = require('../models/User');
const Subject = require('../models/Subject');
const QuizScore = require('../models/QuizScore');
const Goal = require('../models/Goals');

// ==================== Helper Functions ====================

// Helper: Get current week number
const getCurrentWeekNumber = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
};

// Helper: Format activity time
const formatActivityTime = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

// ==================== Stats Helpers ====================

const getProgressStats = async (userId) => {
  const subjects = await Subject.find({ user: userId });
  const completed = subjects.filter(s => s.completed).length;
  const totalHours = subjects.reduce((acc, s) => acc + (s.hoursPerDay || 0), 0);
  const upcoming = subjects.filter(s => !s.completed && new Date(s.examDate) > new Date()).length;
  
  return {
    totalSubjects: subjects.length,
    activeSubjects: subjects.filter(s => !s.completed).length,
    completedSubjects: completed,
    totalStudyHours: totalHours,
    upcomingExams: upcoming,
    completionRate: subjects.length ? Math.round((completed / subjects.length) * 100) : 0,
  };
};

const getWeeklyProgressData = async (userId) => {
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  
  const weekly = await Progress.aggregate([
    { $match: { user: userId, date: { $gte: startOfWeek } } },
    { $group: {
      _id: { $dayOfWeek: '$date' },
      hours: { $sum: '$studyHours' }
    }}
  ]);
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.map((day, i) => ({
    day,
    hours: weekly.find(w => w._id === i)?.hours || 0
  }));
};

const getPerformanceDataForUser = async (userId, query = {}) => {
  const weeks = parseInt(query.weeks) || 6;
  const subject = query.subject;
  
  const scoreQuery = { user: userId };
  if (subject && subject !== 'all') scoreQuery.subject = subject;
  
  const scores = await QuizScore.find(scoreQuery).sort({ createdAt: -1 }).limit(weeks * 5);
  
  const weeklyData = [];
  const currentWeek = getCurrentWeekNumber();
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekNum = currentWeek - i;
    const weekScores = scores.filter(s => s.week === weekNum);
    const avgScore = weekScores.length > 0
      ? Math.round(weekScores.reduce((sum, s) => sum + s.score, 0) / weekScores.length)
      : 0;
    
    weeklyData.push({
      week: `W${weekNum}`,
      score: avgScore,
    });
  }
  
  return weeklyData;
};

const getRecentActivitiesData = async (userId, limit = 20) => {
  const activities = await Activity.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));
  
  return activities.map(activity => ({
    _id: activity._id,
    type: activity.type,
    description: activity.description,
    time: formatActivityTime(activity.createdAt),
    createdAt: activity.createdAt,
  }));
};

const getStudyStreakData = async (userId) => {
  const progress = await Progress.find({ user: userId }).sort({ date: -1 }).limit(30);
  
  let streak = 0;
  const today = new Date().setHours(0, 0, 0, 0);
  
  for (let i = 0; i < progress.length; i++) {
    const logDate = new Date(progress[i].date).setHours(0, 0, 0, 0);
    const expectedDate = today - (i * 86400000);
    
    if (logDate === expectedDate) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

const getAchievementsData = async (userId) => {
  const stats = await getProgressStats(userId);
  const streak = await getStudyStreakData(userId);
  const achievements = [];
  
  if (streak >= 7) achievements.push({ id: 'streak_7', name: '7-Day Warrior', icon: '🔥', earned: true });
  if (streak >= 30) achievements.push({ id: 'streak_30', name: 'Legendary Streak', icon: '⚡', earned: true });
  if (stats.totalStudyHours >= 50) achievements.push({ id: 'hours_50', name: '50 Hours Club', icon: '📚', earned: true });
  if (stats.totalStudyHours >= 100) achievements.push({ id: 'hours_100', name: 'Century Club', icon: '💯', earned: true });
  if (stats.completedSubjects >= 5) achievements.push({ id: 'complete_5', name: 'Topic Master', icon: '✅', earned: true });
  if (stats.completedSubjects >= 20) achievements.push({ id: 'complete_20', name: 'Scholarship', icon: '🎓', earned: true });
  
  return achievements;
};

const getGoalsData = async (userId) => {
  const goal = await Goal.findOne({ user: userId, completed: false }).sort({ createdAt: -1 });
  
  if (!goal) return null;
  
  const stats = await getProgressStats(userId);
  const progress = Math.min(100, Math.round((stats.totalStudyHours / goal.targetHours) * 100));
  
  return {
    targetHours: goal.targetHours,
    targetTopics: goal.targetTopics,
    currentHours: stats.totalStudyHours,
    currentTopics: stats.completedSubjects,
    progress,
  };
};

const getSubjectProgressData = async (userId) => {
  const subjects = await Subject.find({ user: userId });
  const progress = [];
  
  for (const subject of subjects) {
    const subjectProgress = await Progress.aggregate([
      { $match: { user: userId } },
      { $unwind: '$subjectsStudied' },
      { $match: { 'subjectsStudied.subjectId': subject._id } },
      { $group: {
        _id: null,
        totalHours: { $sum: '$subjectsStudied.hours' },
        totalTopics: { $sum: '$subjectsStudied.topics' },
      }}
    ]);
    
    progress.push({
      _id: subject._id,
      name: subject.name,
      completed: subject.completed,
      hoursSpent: subjectProgress[0]?.totalHours || 0,
      topicsCompleted: subjectProgress[0]?.totalTopics || 0,
      hoursPlanned: subject.hoursPerDay,
      examDate: subject.examDate,
    });
  }
  
  return progress;
};

// ==================== Main Progress Endpoint ====================

// @desc    Get all progress data for user
// @route   GET /api/progress
// @access  Private
const getProgress = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { user: req.user._id };
    if (startDate) query.date = { $gte: new Date(startDate) };
    if (endDate) query.date = { ...query.date, $lte: new Date(endDate) };
    
    const progress = await Progress.find(query).sort({ date: -1 });
    const stats = await getProgressStats(req.user._id);
    const weeklyData = await getWeeklyProgressData(req.user._id);
    const performanceData = await getPerformanceDataForUser(req.user._id);
    const activities = await getRecentActivitiesData(req.user._id);
    const achievements = await getAchievementsData(req.user._id);
    const streak = await getStudyStreakData(req.user._id);
    const goals = await getGoalsData(req.user._id);
    const subjectProgress = await getSubjectProgressData(req.user._id);
    
    res.json({
      progress,
      stats,
      weeklyData,
      performanceData,
      activities,
      achievements,
      streak,
      goals,
      subjectProgress,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== Stats Endpoint ====================

// @desc    Get progress stats
// @route   GET /api/progress/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const stats = await getProgressStats(req.user._id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== Weekly Progress ====================

// @desc    Get weekly progress (study hours per day)
// @route   GET /api/progress/weekly
// @access  Private
const getWeeklyProgress = async (req, res) => {
  try {
    const data = await getWeeklyProgressData(req.user._id);
    res.json(data);
  } catch (error) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    res.json(days.map(day => ({ day, hours: 0 })));
  }
};

// ==================== Performance Data ====================

// @desc    Get performance data (quiz scores)
// @route   GET /api/progress/performance
// @access  Private
const getPerformanceData = async (req, res) => {
  try {
    const data = await getPerformanceDataForUser(req.user._id, req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get simple performance data (for charts)
// @route   GET /api/progress/performance/simple
// @access  Private
const getSimplePerformanceData = async (req, res) => {
  try {
    const data = await getPerformanceDataForUser(req.user._id, req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== Activities ====================

// @desc    Get recent activities
// @route   GET /api/progress/activities
// @access  Private
const getActivities = async (req, res) => {
  try {
    const data = await getRecentActivitiesData(req.user._id, req.query.limit);
    res.json(data);
  } catch (error) {
    res.json([]);
  }
};

// Alias for getActivities (backward compatibility)
const getRecentActivities = getActivities;

// ==================== Streak ====================

// @desc    Get study streak
// @route   GET /api/progress/streak
// @access  Private
const getStudyStreak = async (req, res) => {
  try {
    const streak = await getStudyStreakData(req.user._id);
    res.json({ streak });
  } catch (error) {
    res.json({ streak: 0 });
  }
};

// @desc    Update streak
// @route   PUT /api/progress/streak
// @access  Private
const updateStreak = async (req, res) => {
  try {
    const streak = await getStudyStreakData(req.user._id);
    await User.findByIdAndUpdate(req.user._id, { streak });
    res.json({ streak });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== Achievements ====================

// @desc    Get achievements
// @route   GET /api/progress/achievements
// @access  Private
const getAchievements = async (req, res) => {
  try {
    const data = await getAchievementsData(req.user._id);
    res.json(data);
  } catch (error) {
    res.json([]);
  }
};

// ==================== Subject Progress ====================

// @desc    Get progress for all subjects
// @route   GET /api/progress/subjects
// @access  Private
const getAllSubjectsProgress = async (req, res) => {
  try {
    const data = await getSubjectProgressData(req.user._id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get progress for a specific subject
// @route   GET /api/progress/subject/:subjectId
// @access  Private
const getSubjectProgressById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    if (subject.user.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });
    
    const progress = await Progress.find({ user: req.user._id, 'subjectsStudied.subjectId': subject._id });
    
    res.json({
      subject: subject.name,
      completed: subject.completed,
      hoursSpent: progress.reduce((acc, p) => acc + (p.subjectsStudied.find(s => s.subjectId.toString() === subject._id)?.hours || 0), 0),
      topicsCompleted: progress.reduce((acc, p) => acc + (p.subjectsStudied.find(s => s.subjectId.toString() === subject._id)?.topics || 0), 0),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== Goals ====================

// @desc    Get study goals
// @route   GET /api/progress/goal
// @access  Private
const getStudyGoal = async (req, res) => {
  try {
    const data = await getGoalsData(req.user._id);
    res.json(data);
  } catch (error) {
    res.json({ targetHours: 10, targetTopics: 5, progress: 0 });
  }
};

// @desc    Set study goal
// @route   POST /api/progress/goal
// @access  Private
const setStudyGoal = async (req, res) => {
  try {
    const { targetHours, targetTopics, type } = req.body;
    
    const goal = await Goal.create({
      user: req.user._id,
      type: type || 'weekly',
      targetHours,
      targetTopics,
      startDate: new Date(),
    });
    
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== Study Logging ====================

// @desc    Log a study session
// @route   POST /api/progress/study
// @access  Private
const logStudySession = async (req, res) => {
  try {
    const { hours, topics, subjectId, subjectName } = req.body;
    const today = new Date().setHours(0, 0, 0, 0);
    
    let progress = await Progress.findOne({
      user: req.user._id,
      date: today,
    });
    
    if (progress) {
      progress.studyHours += hours || 0;
      progress.topicsCompleted += topics || 0;
      
      if (subjectId) {
        const existing = progress.subjectsStudied.find(s => s.subjectId.toString() === subjectId);
        if (existing) {
          existing.hours += hours || 0;
          existing.topics += topics || 0;
        } else {
          progress.subjectsStudied.push({
            subjectId,
            name: subjectName,
            hours: hours || 0,
            topics: topics || 0,
          });
        }
      }
      
      await progress.save();
    } else {
      progress = await Progress.create({
        user: req.user._id,
        date: today,
        studyHours: hours || 0,
        topicsCompleted: topics || 0,
        subjectsStudied: subjectId ? [{
          subjectId,
          name: subjectName,
          hours: hours || 0,
          topics: topics || 0,
        }] : [],
      });
    }
    
    await Activity.create({
      user: req.user._id,
      type: 'study',
      description: `Studied ${subjectName || 'subject'} for ${hours} hours`,
      details: { hours, topics, subjectId, subjectName },
    });
    
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalStudyHours: hours || 0 },
      lastActive: Date.now(),
    });
    
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== Quiz Score Submission ====================

// @desc    Submit quiz score
// @route   POST /api/progress/quiz
// @access  Private
const submitQuizScore = async (req, res) => {
  try {
    const { subject, topic, score, totalQuestions, correctAnswers } = req.body;
    
    const quizScore = await QuizScore.create({
      user: req.user._id,
      subject,
      topic,
      score,
      totalQuestions,
      correctAnswers,
      week: getCurrentWeekNumber(),
    });
    
    await Activity.create({
      user: req.user._id,
      type: 'quiz',
      description: `Scored ${score}% on ${subject} ${topic ? `(${topic})` : 'quiz'}`,
      details: { subject, topic, score, totalQuestions, correctAnswers },
    });
    
    res.status(201).json(quizScore);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== Get Quiz Scores ====================

// @desc    Get quiz scores
// @route   GET /api/progress/quiz
// @access  Private
const getQuizScores = async (req, res) => {
  try {
    const { subject } = req.query;
    const query = { user: req.user._id };
    if (subject) query.subject = subject;
    
    const scores = await QuizScore.find(query).sort({ createdAt: -1 });
    res.json(scores);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== Export Progress Data ====================

// @desc    Export progress data
// @route   GET /api/progress/export
// @access  Private
const exportProgressData = async (req, res) => {
  try {
    const progress = await Progress.find({ user: req.user._id }).sort({ date: 1 });
    const subjects = await Subject.find({ user: req.user._id });
    const quizScores = await QuizScore.find({ user: req.user._id }).sort({ createdAt: 1 });
    const activities = await Activity.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    
    const exportData = {
      user: {
        name: req.user.name,
        email: req.user.email,
        level: req.user.level,
        streak: req.user.streak,
        totalStudyHours: req.user.totalStudyHours,
      },
      subjects,
      progress,
      quizScores,
      recentActivities: activities,
      exportDate: new Date(),
    };
    
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== Module Exports ====================

module.exports = {
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
  getRecentActivities,
  
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
};