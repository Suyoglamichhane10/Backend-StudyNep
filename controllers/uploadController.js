const { getGridFSBucket } = require('../config/gridfs');
const Material = require('../models/Material');
const mongoose = require('mongoose');
const { Readable } = require('stream');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper function to verify token from query or headers
const verifyToken = async (req) => {
  // Check for token in query params first
  let token = req.query.token;
  
  // If not in query, check Authorization header
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    return user;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};

// Upload PDF file to GridFS
const uploadPDF = async (req, res) => {
  try {
    const { title, subject } = req.body;
    const bucket = getGridFSBucket();
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!bucket) {
      return res.status(500).json({ message: 'GridFS not initialized' });
    }

    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      metadata: {
        originalName: req.file.originalname,
        uploadedBy: req.user.id,
        title: title || req.file.originalname,
      }
    });

    readableStream.pipe(uploadStream);

    uploadStream.on('error', (error) => {
      console.error('Upload error:', error);
      return res.status(500).json({ message: 'Upload failed' });
    });

    uploadStream.on('finish', async () => {
      const material = await Material.create({
        title: title || req.file.originalname,
        type: 'PDF',
        subject,
        filename: req.file.originalname,
        fileId: uploadStream.id.toString(),
        uploadedBy: req.user.id,
      });

      res.status(201).json(material);
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Upload Video/Link
const uploadLink = async (req, res) => {
  try {
    const { title, subject, type, fileUrl } = req.body;
    
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

// Download PDF file (with token support)
const downloadPDF = async (req, res) => {
  try {
    // Verify user from token (query or header)
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, please login' });
    }

    const material = await Material.findById(req.params.id);
    if (!material || !material.fileId) {
      return res.status(404).json({ message: 'File not found' });
    }

    const bucket = getGridFSBucket();
    if (!bucket) {
      return res.status(500).json({ message: 'GridFS not initialized' });
    }

    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(material.fileId));
    
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${material.filename}"`);
    
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('Download error:', error);
      res.status(500).json({ message: 'File not found' });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// View PDF inline (with token support)
const viewPDF = async (req, res) => {
  try {
    // Verify user from token (query or header)
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, please login' });
    }

    const material = await Material.findById(req.params.id);
    if (!material || !material.fileId) {
      return res.status(404).json({ message: 'File not found' });
    }

    const bucket = getGridFSBucket();
    if (!bucket) {
      return res.status(500).json({ message: 'GridFS not initialized' });
    }

    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(material.fileId));
    
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'inline');
    
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('View error:', error);
      res.status(500).json({ message: 'File not found' });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all materials
const getAllMaterials = async (req, res) => {
  try {
    const materials = await Material.find()
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete material
const deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    if (material.fileId) {
      const bucket = getGridFSBucket();
      if (bucket) {
        try {
          await bucket.delete(new mongoose.Types.ObjectId(material.fileId));
        } catch (err) {
          console.error('Error deleting from GridFS:', err);
        }
      }
    }

    await material.deleteOne();
    res.json({ message: 'Material deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadPDF,
  uploadLink,
  downloadPDF,
  viewPDF,
  getAllMaterials,
  deleteMaterial,
};