const StudyPlan = require('../models/StudyPlan');
const Subject = require('../models/Subject');

// @desc    Get user's study plan
// @route   GET /api/studyplan
// @access  Private
const getStudyPlan = async (req, res) => {
  try {
    let studyPlan = await StudyPlan.findOne({ user: req.user.id }).populate('subjects');
    if (!studyPlan) {
      // Create a new plan if none exists
      studyPlan = await StudyPlan.create({ user: req.user.id, subjects: [] });
    }
    res.json(studyPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add subjects to study plan
// @route   PUT /api/studyplan/add
// @access  Private
const addSubjectsToPlan = async (req, res) => {
  try {
    const { subjectIds } = req.body;
    let studyPlan = await StudyPlan.findOne({ user: req.user.id });

    if (!studyPlan) {
      studyPlan = await StudyPlan.create({ user: req.user.id, subjects: subjectIds });
    } else {
      // Merge without duplicates
      const existingIds = studyPlan.subjects.map(s => s.toString());
      const newIds = subjectIds.filter(id => !existingIds.includes(id));
      studyPlan.subjects.push(...newIds);
      await studyPlan.save();
    }

    const populated = await StudyPlan.findById(studyPlan._id).populate('subjects');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove subject from plan
// @route   DELETE /api/studyplan/:subjectId
// @access  Private
const removeSubjectFromPlan = async (req, res) => {
  try {
    const studyPlan = await StudyPlan.findOne({ user: req.user.id });
    if (!studyPlan) {
      return res.status(404).json({ message: 'Study plan not found' });
    }

    studyPlan.subjects = studyPlan.subjects.filter(
      s => s.toString() !== req.params.subjectId
    );
    await studyPlan.save();

    res.json({ message: 'Subject removed from plan' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStudyPlan, addSubjectsToPlan, removeSubjectFromPlan };