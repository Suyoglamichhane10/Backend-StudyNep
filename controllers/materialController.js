const Material = require('../models/Material');

// @desc    Get all materials (public or filtered)
// @route   GET /api/materials
// @access  Public
const getMaterials = async (req, res) => {
  try {
    const materials = await Material.find().populate('uploadedBy', 'name');
    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload a new material (teacher only)
// @route   POST /api/materials
// @access  Private/Teacher
const createMaterial = async (req, res) => {
  try {
    const { title, type, subject, fileUrl } = req.body;
    const material = await Material.create({
      title,
      type,
      subject,
      fileUrl,
      uploadedBy: req.user.id,
    });
    res.status(201).json(material);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a material (teacher only)
// @route   DELETE /api/materials/:id
// @access  Private/Teacher
const deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }
    await material.deleteOne();
    res.json({ message: 'Material removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMaterials, createMaterial, deleteMaterial };