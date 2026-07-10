const mongoose = require('mongoose');

const QuizAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
    index: true,
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    selectedAnswer: {
      type: Number,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  }],
  score: {
    type: Number,
    required: true,
    default: 0,
  },
  totalQuestions: {
    type: Number,
    required: true,
    default: 0,
  },
  percentage: {
    type: Number,
    required: true,
    default: 0,
  },
  timeTaken: {
    type: Number, // Time taken in seconds
    default: 0,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned'],
    default: 'completed',
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
QuizAttemptSchema.index({ user: 1, quiz: 1, completedAt: -1 });

// Virtual for formatted date
QuizAttemptSchema.virtual('formattedDate').get(function() {
  return this.completedAt.toLocaleDateString();
});

// Method to check if passed
QuizAttemptSchema.methods.isPassing = function(passingScore = 60) {
  return this.percentage >= passingScore;
};

// Static method to get user's average score for a quiz
QuizAttemptSchema.statics.getAverageScoreForQuiz = async function(quizId) {
  const result = await this.aggregate([
    { $match: { quiz: quizId, status: 'completed' } },
    { $group: {
      _id: null,
      averageScore: { $avg: '$percentage' },
      totalAttempts: { $sum: 1 },
      highestScore: { $max: '$percentage' },
      lowestScore: { $min: '$percentage' },
    }}
  ]);
  
  return result[0] || { averageScore: 0, totalAttempts: 0, highestScore: 0, lowestScore: 0 };
};

// Static method to get user's best attempt for a quiz
QuizAttemptSchema.statics.getBestAttempt = async function(userId, quizId) {
  return this.findOne({ user: userId, quiz: quizId, status: 'completed' })
    .sort({ percentage: -1 })
    .limit(1);
};

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);