const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['PDF', 'Video', 'Link'], default: 'PDF' },
  subject: { type: String, required: true },
  filename: { type: String },
  fileId: { type: String },
  fileUrl: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Material', MaterialSchema);