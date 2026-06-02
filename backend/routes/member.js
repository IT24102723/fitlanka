const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Payment = require('../models/Payment');
const { ensureAuth } = require('../middleware/auth');

const WEBSITE_FEE = 500;
const USD_RATE = Number(process.env.PAYPAL_USD_RATE) || 330;

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
  res.render('member/dashboard', { member, completedPayment, pendingPayment, messages: req.flash() });
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
  const total = fee + WEBSITE_FEE;
  const usdTotal = (total / USD_RATE).toFixed(2);

  let payment = await Payment.findOne({ member: member._id, status: 'pending' });
  if (!payment) {
    payment = await Payment.create({
      member: member._id,
      coach: coach._id,
      amount: fee,
      websiteFee: WEBSITE_FEE,
      totalAmount: total,
      status: 'pending',
      paymentMethod: 'paypal'
    });
  }

  const paypalEmail = process.env.PAYPAL_EMAIL;
  const baseUrl = process.env.BASE_URL || ('https://' + (process.env.VERCEL_URL || 'localhost:5000'));
  const returnUrl = baseUrl + '/member/success?payment=' + payment._id;
  const cancelUrl = baseUrl + '/member/cancel';
  const notifyUrl = baseUrl + '/payment/paypal-ipn';
  const isSandbox = process.env.PAYPAL_SANDBOX === 'true';
  const checkoutUrl = isSandbox
    ? 'https://www.sandbox.paypal.com/cgi-bin/webscr'
    : 'https://www.paypal.com/cgi-bin/webscr';

  res.render('member/payment', {
    coach,
    member,
    fee,
    websiteFee: WEBSITE_FEE,
    total,
    usdTotal,
    payment,
    paypalEmail,
    returnUrl,
    cancelUrl,
    notifyUrl,
    checkoutUrl,
    isSandbox,
    bank: bankDetails,
    messages: req.flash()
  });
});

router.get('/success', ensureAuth, async (req, res) => {
  const { payment, st } = req.query;

  if (st === 'Completed' || st === 'completed') {
    const p = await Payment.findById(payment);
    if (p && p.status !== 'completed') {
      p.status = 'completed';
      p.paymentMethod = 'paypal';
      await p.save();
      req.session.user.selectedCoach = (await User.findById(p.member)).selectedCoach;
    }
    req.flash('success', 'Payment successful! Coach contact details are now available.');
  } else {
    req.flash('success', 'Payment submitted! Confirming with PayPal... Check dashboard shortly.');
  }
  res.redirect('/member/dashboard');
});

router.get('/cancel', ensureAuth, async (req, res) => {
  req.flash('error', 'Payment cancelled.');
  res.redirect('/member/coaches');
});

router.post('/confirm-payment', ensureAuth, async (req, res) => {
  try {
    const { paymentId, manualRef } = req.body;
    const payment = await Payment.findById(paymentId);

    if (!payment || payment.member.toString() !== req.session.user.id) {
      req.flash('error', 'Invalid payment');
      return res.redirect('/member/dashboard');
    }

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
