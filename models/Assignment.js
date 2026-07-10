const mongoose = require('mongoose');

const assignmentFileSchema = new mongoose.Schema(
  {
    filename: String,
    originalName: String,
    fileId: String,
    mimetype: String,
    size: Number,
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true },
    file: assignmentFileSchema,
    submittedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['Submitted', 'Late'],
      default: 'Submitted',
    },
  },
  { _id: true }
);

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    instructions: { type: String, required: true, trim: true },
    deadline: { type: Date, required: true },
    totalMarks: { type: Number, default: 100, min: 0 },
    attachment: assignmentFileSchema,
    resourceUrl: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    submissions: [submissionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
