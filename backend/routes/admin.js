const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { ensureAuth, ensureAdmin } = require('../middleware/auth');
const { sendApprovalNotification, sendRejectionNotification, sendRegistrationNotification } = require('../config/notifications');

router.use(ensureAuth, ensureAdmin);

router.get('/dashboard', async (req, res) => {
  const pendingCoaches = await User.countDocuments({ role: 'coach', status: 'pending' });
  const pendingMembers = await User.countDocuments({ role: 'member', status: 'pending' });
  const totalCoaches = await User.countDocuments({ role: 'coach', status: 'approved' });
  const totalMembers = await User.countDocuments({ role: 'member', status: 'approved' });
  const totalPayments = await Payment.countDocuments({ status: 'completed' });
  const pendingPayments = await Payment.countDocuments({ status: 'pending' });
  res.render('admin/dashboard', { pendingCoaches, pendingMembers, totalCoaches, totalMembers, totalPayments, pendingPayments, messages: req.flash() });
});

router.get('/coaches', async (req, res) => {
  const coaches = await User.find({ role: 'coach' }).sort({ createdAt: -1 });
  res.render('admin/coaches', { coaches, messages: req.flash() });
});

router.get('/members', async (req, res) => {
  const members = await User.find({ role: 'member' }).sort({ createdAt: -1 });
  res.render('admin/members', { members, messages: req.flash() });
});

router.get('/users/add', (req, res) => {
  const role = req.query.role || 'member';
  res.render('admin/add-user', { role, userData: null, messages: req.flash() });
});

router.post('/users/add', async (req, res) => {
  try {
    const { name, email, phone, password, role, status, district, city, profileImage, experience, specialties, ratePerMonth, bio, age, gender, fitnessGoals, healthConditions } = req.body;
    const exists = await User.findOne({ email });
    if (exists) {
      req.flash('error', 'Email already registered');
      return res.redirect('back');
    }
    const userData = { name, email, phone, password, role, status: status || 'approved', district: district || '', city: city || '', profileImage: profileImage || '' };
    if (role === 'coach') {
      userData.coachDetails = {
        experience: experience || '',
        specialties: specialties ? specialties.split(',').map(s => s.trim()) : [],
        ratePerMonth: Number(ratePerMonth) || 0,
        bio: bio || ''
      };
    } else {
      userData.memberDetails = { age: Number(age) || 0, gender: gender || '', fitnessGoals: fitnessGoals || '', healthConditions: healthConditions || '' };
    }
    const user = new User(userData);
    await user.save();
    sendRegistrationNotification(user);
    if (user.status === 'approved') sendApprovalNotification(user);
    req.flash('success', `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully`);
    res.redirect(role === 'coach' ? '/admin/coaches' : '/admin/members');
  } catch (err) {
    req.flash('error', 'Error adding user: ' + err.message);
    res.redirect('back');
  }
});

router.get('/users/edit/:id', async (req, res) => {
  const userData = await User.findById(req.params.id);
  if (!userData) { req.flash('error', 'User not found'); return res.redirect('/admin/dashboard'); }
  res.render('admin/edit-user', { userData, messages: req.flash() });
});

router.post('/users/edit/:id', async (req, res) => {
  try {
    const { name, email, phone, password, status, district, city, profileImage, experience, specialties, ratePerMonth, bio, age, gender, fitnessGoals, healthConditions } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) { req.flash('error', 'User not found'); return res.redirect('/admin/dashboard'); }
    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.district = district || user.district;
    user.city = city || user.city;
    if (profileImage) user.profileImage = profileImage;
    if (password) user.password = password;
    if (status) user.status = status;
    if (user.role === 'coach') {
      user.coachDetails = {
        ...user.coachDetails,
        experience: experience || '',
        specialties: specialties ? specialties.split(',').map(s => s.trim()) : [],
        ratePerMonth: Number(ratePerMonth) || 0,
        bio: bio || ''
      };
    } else if (user.role === 'member') {
      user.memberDetails = { age: Number(age) || 0, gender: gender || '', fitnessGoals: fitnessGoals || '', healthConditions: healthConditions || '' };
    }
    await user.save();
    req.flash('success', 'User updated successfully');
    res.redirect(user.role === 'coach' ? '/admin/coaches' : '/admin/members');
  } catch (err) {
    req.flash('error', 'Error updating user: ' + err.message);
    res.redirect('back');
  }
});

router.post('/users/status/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (req.body.status === 'approved') sendApprovalNotification(user);
  else if (req.body.status === 'rejected') sendRejectionNotification(user);
  req.flash('success', `User status changed to ${req.body.status}`);
  res.redirect('back');
});

router.post('/users/delete/:id', async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  req.flash('success', 'User deleted successfully');
  res.redirect('back');
});

router.post('/approve/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
  sendApprovalNotification(user);
  req.flash('success', 'User approved — email & SMS sent');
  res.redirect('back');
});

router.post('/reject/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
  sendRejectionNotification(user);
  req.flash('success', 'User rejected — email & SMS sent');
  res.redirect('back');
});

router.get('/payments', async (req, res) => {
  const pending = await Payment.find({ status: 'pending' }).populate('member coach', 'name email phone').sort({ createdAt: -1 });
  const completed = await Payment.find({ status: 'completed' }).populate('member coach', 'name email phone').sort({ createdAt: -1 });
  res.render('admin/payments', { pending, completed, pendingCount: pending.length, messages: req.flash() });
});

router.post('/payments/confirm/:id', async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, { status: 'completed', notes: 'Confirmed by admin' }, { new: true });
    if (!payment) { req.flash('error', 'Payment not found'); return res.redirect('back'); }
    req.flash('success', 'Payment confirmed successfully');
    res.redirect('back');
  } catch (err) {
    req.flash('error', 'Error confirming payment: ' + err.message);
    res.redirect('back');
  }
});

module.exports = router;
