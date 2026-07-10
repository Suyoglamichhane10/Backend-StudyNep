const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'weekly',
  },
  targetHours: {
    type: Number,
    default: 10,
  },
  targetTopics: {
    type: Number,
    default: 5,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: Date,
  completed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Goal', GoalSchema);