const Flashcard = require('../models/Flashcard');

const getFlashcards = async (req, res) => {
  try {
    const flashcards = await Flashcard.find({ user: req.user.id });
    res.json(flashcards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createFlashcard = async (req, res) => {
  try {
    const { front, back } = req.body;
    const flashcard = await Flashcard.create({ front, back, user: req.user.id });
    res.status(201).json(flashcard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateFlashcard = async (req, res) => {
  try {
    const flashcard = await Flashcard.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(flashcard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteFlashcard = async (req, res) => {
  try {
    await Flashcard.findByIdAndDelete(req.params.id);
    res.json({ message: 'Flashcard deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getFlashcards, createFlashcard, updateFlashcard, deleteFlashcard };