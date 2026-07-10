const Subject = require('../models/Subject');
const Activity = require('../models/Activity');

const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ user: req.user.id }).sort({ examDate: 1 });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSubject = async (req, res) => {
  try {
    const { name, examDate, priority, hoursPerDay, description } = req.body;
    const subject = await Subject.create({
      name, examDate, priority, hoursPerDay, description, user: req.user.id
    });
    await Activity.create({ user: req.user.id, type: 'start', description: `Started studying ${name}` });
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSubject = async (req, res) => {
  try {
    let subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    if (subject.user.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });
    const wasCompleted = subject.completed;
    subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!wasCompleted && subject.completed) {
      await Activity.create({ user: req.user.id, type: 'complete', description: `Completed ${subject.name}` });
    }
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    if (subject.user.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });
    await subject.deleteOne();
    res.json({ message: 'Subject removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  Log study hours for a subject
const logStudySession = async (req, res) => {
  try {
    const { id } = req.params;
    const { hours } = req.body;
    const subject = await Subject.findById(id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    if (subject.user.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

    subject.studiedHours = (subject.studiedHours || 0) + hours;
    await subject.save();

    // Optional: Create an activity
    await Activity.create({
      user: req.user.id,
      type: 'study',
      description: `Logged ${hours} hours of study for ${subject.name}`,
    });

    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  logStudySession,   // ✅ Must be exported
};