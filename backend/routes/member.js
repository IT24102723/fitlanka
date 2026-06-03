const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Payment = require('../models/Payment');
const { ensureAuth } = require('../middleware/auth');

const WEBSITE_FEE = 500;

const bankDetails = {
  bankName: 'Bank of Ceylon',
  accountName: 'FitLanka (Pvt) Ltd',
  accountNumber: '80234567',
  branch: 'Colombo Main Street',
  bankCode: 'BOC001'
};

router.get('/dashboard', ensureAuth, async (req, res) => {
  if (req.session.user.role !== 'member') return res.redirect('/login');

  const member = await User.findById(req.session.user.id).populate('selectedCoach', 'name email phone');
  const completedPayment = await Payment.findOne({ member: member._id, status: 'completed' }).populate('coach', 'name');
  const pendingPayment = await Payment.findOne({ member: member._id, status: 'pending' }).populate('coach', 'name');
  const coaches = await User.find({ role: 'coach', status: 'approved' }, 'name');
  res.render('member/dashboard', { member, completedPayment, pendingPayment, coaches, messages: req.flash() });
});

router.get('/coaches', ensureAuth, async (req, res) => {
  const coaches = await User.find({ role: 'coach', status: 'approved' });
  res.render('member/coaches', { coaches, messages: req.flash() });
});

router.get('/select-coach/:id', ensureAuth, async (req, res) => {
  const member = await User.findById(req.session.user.id);
  const coach = await User.findById(req.params.id);

  if (!coach || coach.role !== 'coach' || coach.status !== 'approved') {
    req.flash('error', 'Invalid coach');
    return res.redirect('/member/coaches');
  }

  member.selectedCoach = coach._id;
  await member.save();

  const fee = coach.coachDetails.ratePerMonth || 2000;

  let payment = await Payment.findOne({ member: member._id, status: 'pending' });
  if (!payment) {
    payment = await Payment.create({
      member: member._id,
      coach: coach._id,
      amount: fee,
      websiteFee: WEBSITE_FEE,
      totalAmount: fee + WEBSITE_FEE,
      status: 'pending',
      paymentMethod: 'manual',
      membershipDuration: 1
    });
  }

  const durations = [1, 3, 6];

  res.render('member/payment', {
    coach,
    member,
    fee,
    websiteFee: WEBSITE_FEE,
    total: payment.totalAmount,
    payment,
    bank: bankDetails,
    durations,
    messages: req.flash()
  });
});

router.get('/success', ensureAuth, async (req, res) => {
  res.redirect('/member/dashboard');
});

router.get('/cancel', ensureAuth, async (req, res) => {
  req.flash('error', 'Payment cancelled.');
  res.redirect('/member/coaches');
});

router.post('/demo-pay/:paymentId', ensureAuth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate('coach', 'coachDetails');
    if (!payment || payment.member.toString() !== req.session.user.id) {
      return res.json({ success: false, error: 'Invalid payment' });
    }

    const months = parseInt(req.body.membershipDuration) || 1;
    const fee = payment.coach?.coachDetails?.ratePerMonth || 2000;
    const total = fee * months + WEBSITE_FEE;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + months);

    payment.membershipDuration = months;
    payment.amount = fee;
    payment.totalAmount = total;
    payment.expiryDate = expiry;
    payment.status = 'completed';
    payment.paymentMethod = 'demo';
    await payment.save();

    const member = await User.findById(payment.member);
    if (member) req.session.user.selectedCoach = member.selectedCoach;

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

router.post('/confirm-payment', ensureAuth, async (req, res) => {
  try {
    const { paymentId, manualRef } = req.body;
    const months = parseInt(req.body.membershipDuration) || 1;
    const payment = await Payment.findById(paymentId).populate('coach', 'coachDetails');

    if (!payment || payment.member.toString() !== req.session.user.id) {
      req.flash('error', 'Invalid payment');
      return res.redirect('/member/dashboard');
    }

    const fee = payment.coach?.coachDetails?.ratePerMonth || 2000;
    const total = fee * months + WEBSITE_FEE;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + months);

    payment.membershipDuration = months;
    payment.amount = fee;
    payment.totalAmount = total;
    payment.expiryDate = expiry;
    payment.manualRef = manualRef;
    payment.paymentMethod = 'manual';
    payment.notes = 'Awaiting admin confirmation';
    await payment.save();

    req.flash('success', 'Payment details submitted. Admin will confirm shortly.');
    res.redirect('/member/dashboard');
  } catch (err) {
    req.flash('error', 'Error: ' + err.message);
    res.redirect('/member/dashboard');
  }
});

module.exports = router;
