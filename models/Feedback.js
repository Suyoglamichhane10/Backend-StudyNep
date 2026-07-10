const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  // The student who receives the feedback
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // The teacher who sent the feedback
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Optional legacy 'user' field kept for compatibility
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  message: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  subject: {
    type: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  reply: {
    message: String,
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    repliedAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);