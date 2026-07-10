const express = require('express');
const { getFlashcards, createFlashcard, updateFlashcard, deleteFlashcard } = require('../controllers/flashcardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').get(getFlashcards).post(createFlashcard);
router.route('/:id').put(updateFlashcard).delete(deleteFlashcard);

module.exports = router;