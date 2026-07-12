const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  // Basic Information
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  
  // Profile Information
  avatar: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  dateOfBirth: { type: Date, default: null },
  bio: { type: String, default: '' },
  
  // Student Specific Fields
  studentId: { type: String, default: '' },
  semester: { type: String, default: '' },
  batch: { type: String, default: '' },
  department: { type: String, default: '' },
  
  // Teacher Specific Fields
  teacherId: { type: String, default: '' },
  qualification: { type: String, default: '' },
  
  // Existing fields
  level: { type: String, default: 'Other' },
  streak: { type: Number, default: 0 },
  totalStudyHours: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  
  // Additional tracking
  joinDate: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Only a hash is stored, so a database leak cannot be used to reset accounts.
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false }
});

// Update the updatedAt timestamp on save
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
