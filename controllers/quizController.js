const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Activity = require('../models/Activity');

// @desc    Create a new quiz (Teacher/Admin only)
// @route   POST /api/quiz
// @access  Private/Teacher
const createQuiz = async (req, res) => {
  try {
    const { title, subject, description, questions, timeLimit, difficulty } = req.body;
    
    const quiz = await Quiz.create({
      title,
      subject,
      description,
      questions,
      createdBy: req.user.id,
      timeLimit: timeLimit || 30,
      difficulty: difficulty || 'medium',
      isPublished: true,   // ✅ Make quiz available immediately
    });
    
    await Activity.create({
      user: req.user.id,
      type: 'create',
      description: `Created quiz: ${title}`,
    });
    
    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all quizzes (filtered by subject, difficulty, etc.)
// @route   GET /api/quiz
// @access  Private
const getQuizzes = async (req, res) => {
  try {
    const { subject, difficulty, search } = req.query;
    const query = { isPublished: true };
    
    if (subject && subject !== 'all') query.subject = subject;
    if (difficulty && difficulty !== 'all') query.difficulty = difficulty;
    if (search) query.title = { $regex: search, $options: 'i' };
    
    const quizzes = await Quiz.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single quiz by ID
// @route   GET /api/quiz/:id
// @access  Private
const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('createdBy', 'name');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update quiz (Teacher/Admin only)
// @route   PUT /api/quiz/:id
// @access  Private/Teacher
const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    const updatedQuiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedQuiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete quiz (Teacher/Admin only)
// @route   DELETE /api/quiz/:id
// @access  Private/Teacher
const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    await quiz.deleteOne();
    res.json({ message: 'Quiz deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit quiz attempt
// @route   POST /api/quiz/:id/attempt
// @access  Private
const submitQuizAttempt = async (req, res) => {
  try {
    const { answers, timeTaken } = req.body;
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    
    let correctCount = 0;
    const formattedAnswers = answers.map((answer, idx) => {
      const question = quiz.questions[idx];
      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        questionId: question._id,
        selectedAnswer: answer.selectedAnswer,
        isCorrect,
      };
    });
    
    const percentage = (correctCount / quiz.questions.length) * 100;
    
    const attempt = await QuizAttempt.create({
      user: req.user.id,
      quiz: quiz._id,
      answers: formattedAnswers,
      score: correctCount,
      percentage,
      timeTaken,
    });
    
    // Update quiz stats
    quiz.attempts += 1;
    quiz.averageScore = ((quiz.averageScore * (quiz.attempts - 1)) + percentage) / quiz.attempts;
    await quiz.save();
    
    await Activity.create({
      user: req.user.id,
      type: 'quiz',
      description: `Completed quiz: ${quiz.title} - Score: ${Math.round(percentage)}%`,
    });
    
    res.json({
      attempt,
      score: correctCount,
      total: quiz.questions.length,
      percentage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's quiz attempts
// @route   GET /api/quiz/attempts
// @access  Private
const getUserAttempts = async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ user: req.user.id })
      .populate('quiz', 'title subject')
      .sort({ completedAt: -1 });
    
    res.json(attempts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get teacher's quizzes (for teacher dashboard)
// @route   GET /api/quiz/teacher/quizzes
// @access  Private/Teacher
const getTeacherQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 });
    
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// const submitQuizAttempt = async (req, res) => {
//   try {
//     const { answers, timeTaken } = req.body;
//     const quiz = await Quiz.findById(req.params.id);
    
//     if (!quiz) {
//       return res.status(404).json({ message: 'Quiz not found' });
//     }
    
//     let correctCount = 0;
//     const formattedAnswers = answers.map((answer, idx) => {
//       const question = quiz.questions[idx];
//       const isCorrect = answer.selectedAnswer === question.correctAnswer;
//       if (isCorrect) correctCount++;
//       return {
//         questionId: question._id,
//         selectedAnswer: answer.selectedAnswer,
//         isCorrect,
//       };
//     });
    
//     const totalQuestions = quiz.questions.length;
//     const percentage = (correctCount / totalQuestions) * 100;
    
//     const attempt = await QuizAttempt.create({
//       user: req.user.id,
//       quiz: quiz._id,
//       answers: formattedAnswers,
//       score: correctCount,
//       totalQuestions: totalQuestions,
//       percentage,
//       timeTaken: timeTaken || 0,
//       status: 'completed',
//     });
    
//     // Update quiz stats
//     quiz.attempts += 1;
//     const stats = await QuizAttempt.getAverageScoreForQuiz(quiz._id);
//     quiz.averageScore = stats.averageScore;
//     await quiz.save();
    
//     // Create activity
//     await Activity.create({
//       user: req.user.id,
//       type: 'quiz',
//       description: `Completed quiz: ${quiz.title} - Score: ${Math.round(percentage)}%`,
//     });
    
//     res.json({
//       attemptId: attempt._id,
//       score: correctCount,
//       total: totalQuestions,
//       percentage,
//       message: percentage >= 60 ? 'Congratulations! You passed!' : 'Keep practicing!',
//     });
//   } catch (error) {
//     console.error('Error submitting quiz attempt:', error);
//     res.status(500).json({ message: error.message });
//   }
// };

// @desc    Get user's quiz attempts
// @route   GET /api/quiz/attempts
// @access  Private
// const getUserAttempts = async (req, res) => {
//   try {
//     const attempts = await QuizAttempt.find({ user: req.user.id })
//       .populate('quiz', 'title subject difficulty')
//       .sort({ completedAt: -1 });
    
//     res.json(attempts);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// @desc    Get specific quiz attempt details
// @route   GET /api/quiz/attempts/:attemptId
// @access  Private
const getAttemptDetails = async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.attemptId)
      .populate('quiz', 'title questions');
    
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }
    
    if (attempt.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Get full question details for each answer
    const quiz = await Quiz.findById(attempt.quiz._id);
    const detailedResults = attempt.answers.map((answer, idx) => {
      const question = quiz.questions.find(q => q._id.toString() === answer.questionId.toString());
      return {
        questionText: question?.text || 'Question not found',
        userAnswer: question?.options[answer.selectedAnswer] || 'Not answered',
        correctAnswer: question?.options[question?.correctAnswer] || 'N/A',
        isCorrect: answer.isCorrect,
        explanation: question?.explanation || '',
      };
    });
    
    res.json({
      attempt,
      detailedResults,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get quiz statistics for teacher
// @route   GET /api/quiz/:id/stats
// @access  Private/Teacher
const getQuizStats = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    if (quiz.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const stats = await QuizAttempt.getAverageScoreForQuiz(quiz._id);
    const attempts = await QuizAttempt.find({ quiz: quiz._id })
      .populate('user', 'name email')
      .sort({ percentage: -1 });
    
    res.json({
      quiz: {
        title: quiz.title,
        subject: quiz.subject,
        totalQuestions: quiz.questions.length,
      },
      stats,
      attempts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  submitQuizAttempt,
  getUserAttempts,
  getTeacherQuizzes,
  getQuizStats,
  getAttemptDetails
};