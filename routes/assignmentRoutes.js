const express = require('express');
const {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  streamAssignmentFile,
} = require('../controllers/assignmentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', protect, getAssignments);
router.post('/', protect, authorize('teacher', 'admin'), upload.single('file'), createAssignment);
router.put('/:id', protect, authorize('teacher', 'admin'), upload.single('file'), updateAssignment);
router.delete('/:id', protect, authorize('teacher', 'admin'), deleteAssignment);
router.post('/:id/submit', protect, authorize('student'), upload.single('file'), submitAssignment);
router.get('/:id/files/:fileType/:submissionId?', protect, streamAssignmentFile);

module.exports = router;
