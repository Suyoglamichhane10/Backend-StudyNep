const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
 type: {
    type: String,
    enum: ['create', 'study', 'quiz', 'achievement', 'complete', 'start', 'upload', 'general'],
    default: 'general',
  },  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Activity', ActivitySchema);