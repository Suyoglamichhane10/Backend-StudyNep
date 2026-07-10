const Feedback = require('../models/Feedback');

// @desc    Get feedback for a student
// @route   GET /api/feedback/student/:studentId
// @access  Private (teacher or student themselves)
const getFeedbackForStudent = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ student: req.params.studentId })
      .populate('teacher', 'name');
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create feedback (teacher only)
// @route   POST /api/feedback
// @access  Private/Teacher
const createFeedback = async (req, res) => {
  try {
    const { studentId, message } = req.body;
    const feedback = await Feedback.create({
      student: studentId,
      teacher: req.user.id,
      message,
      user: req.user.id
    });
    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete feedback (teacher only)
// @route   DELETE /api/feedback/:id
// @access  Private/Teacher
const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
    await feedback.deleteOne();
    res.json({ message: 'Feedback removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getFeedbackForStudent, createFeedback, deleteFeedback };