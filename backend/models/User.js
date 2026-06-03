const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  district: { type: String, default: '' },
  city: { type: String, default: '' },
  profileImage: { type: String, default: '' },
  role: {
    type: String,
    enum: ['admin', 'coach', 'member'],
    default: 'member'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  coachDetails: {
    certificates: [{ name: String, file: String }],
    experience: { type: String },
    specialties: [{ type: String }],
    bio: { type: String },
    profileImage: { type: String, default: '' },
    ratePerMonth: { type: Number }
  },
  memberDetails: {
    age: Number,
    gender: String,
    fitnessGoals: String,
    healthConditions: String
  },
  selectedCoach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
