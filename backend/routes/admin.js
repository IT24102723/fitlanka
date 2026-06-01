const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Payment = require('../models/Payment');
const { ensureAuth, ensureAdmin } = require('../middleware/auth');
const { sendApprovalNotification, sendRejectionNotification } = require('../config/notifications');

router.use(ensureAuth, ensureAdmin);

router.get('/dashboard', async (req, res) => {
  const pendingCoaches = await User.countDocuments({ role: 'coach', status: 'pending' });
  const pendingMembers = await User.countDocuments({ role: 'member', status: 'pending' });
  const totalCoaches = await User.countDocuments({ role: 'coach', status: 'approved' });
  const totalMembers = await User.countDocuments({ role: 'member', status: 'approved' });
  const totalPayments = await Payment.countDocuments({ status: 'completed' });
  res.render('admin/dashboard', { pendingCoaches, pendingMembers, totalCoaches, totalMembers, totalPayments, messages: req.flash() });
});

router.get('/coaches', async (req, res) => {
  const coaches = await User.find({ role: 'coach' }).sort({ createdAt: -1 });
  res.render('admin/coaches', { coaches, messages: req.flash() });
});

router.get('/members', async (req, res) => {
  const members = await User.find({ role: 'member' }).sort({ createdAt: -1 });
  res.render('admin/members', { members, messages: req.flash() });
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
  const payments = await Payment.find({ status: 'completed' }).populate('member coach', 'name email phone').sort({ createdAt: -1 });
  res.render('admin/payments', { payments, messages: req.flash() });
});

module.exports = router;
