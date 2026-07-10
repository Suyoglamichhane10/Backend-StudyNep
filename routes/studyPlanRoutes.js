const express = require('express');
const {
  getStudyPlan,
  addSubjectsToPlan,
  removeSubjectFromPlan,
} = require('../controllers/studyPlanController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
  .get(protect, getStudyPlan)
  .put(protect, addSubjectsToPlan);

router.delete('/:subjectId', protect, removeSubjectFromPlan);

module.exports = router;