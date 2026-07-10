const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['streak_7', 'streak_30', 'hours_50', 'hours_100', 'complete_5', 'complete_20'],
    required: true,
  },
  name: String,
  earnedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Achievement', AchievementSchema);