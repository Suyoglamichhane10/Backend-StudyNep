const mongoose = require('mongoose');

const StudyPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subjects: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
  ],
  // Weekly schedule can be generated on the fly
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('StudyPlan', StudyPlanSchema);