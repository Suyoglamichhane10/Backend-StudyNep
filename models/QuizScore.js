const mongoose = require('mongoose');

const QuizScoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    default: '',
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  correctAnswers: {
    type: Number,
    required: true,
  },
  week: {
    type: Number,
    default: function() {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
QuizScoreSchema.index({ user: 1, subject: 1, createdAt: -1 });

module.exports = mongoose.model('QuizScore', QuizScoreSchema);