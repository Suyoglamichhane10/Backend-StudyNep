const express = require('express');
const {
  uploadPDF,
  uploadLink,
  downloadPDF,
  viewPDF,
  getAllMaterials,
  deleteMaterial,
} = require('../controllers/uploadController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Public routes (student view)
router.get('/', getAllMaterials);

// Teacher/Admin routes
router.post('/upload-pdf', protect, authorize('teacher', 'admin'), upload.single('file'), uploadPDF);
router.post('/upload-link', protect, authorize('teacher', 'admin'), uploadLink);
router.get('/download/:id', protect, downloadPDF);
router.get('/view/:id', protect, viewPDF);
router.delete('/:id', protect, authorize('teacher', 'admin'), deleteMaterial);

module.exports = router;