const mongoose = require('mongoose');

const FlashcardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  front: { type: String, required: true },
  back: { type: String, required: true },
  mastered: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Flashcard', FlashcardSchema);