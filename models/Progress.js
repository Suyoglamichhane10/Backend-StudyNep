const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  studyHours: {
    type: Number,
    default: 0,
  },
  topicsCompleted: {
    type: Number,
    default: 0,
  },
  subjectsStudied: [{
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
    name: String,
    hours: Number,
    topics: Number,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
ProgressSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Progress', ProgressSchema);