const express = require('express');
const { getSubjects, createSubject, updateSubject, deleteSubject, logStudySession } = require('../controllers/subjectController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, getSubjects).post(protect, createSubject);
router.route('/:id').put(protect, updateSubject).delete(protect, deleteSubject);
router.post('/:id/log', protect, logStudySession);
// router.post('/:id/log', protect, logStudySession);

module.exports = router;