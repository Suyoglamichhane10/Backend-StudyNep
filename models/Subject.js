const  mongoose   = require("mongoose")

const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  examDate: { type: Date, required: true },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  hoursPerDay: { type: Number, required: true, min: 0.5 },
  studiedHours: { type: Number, default: 0 }, // ✅ Add this field
  completed: { type: Boolean, default: false },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Subjects', SubjectSchema);