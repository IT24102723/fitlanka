const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { ensureAuth } = require('../middleware/auth');

const WEBSITE_FEE = 500;

router.get('/dashboard', ensureAuth, async (req, res) => {
  if (req.session.user.role !== 'member') return res.redirect('/login');

  const member = await User.findById(req.session.user.id).populate('selectedCoach', 'name email phone');
  const payment = await Payment.findOne({ member: member._id, status: 'completed' }).populate('coach', 'name');
  res.render('member/dashboard', { member, payment, messages: req.flash() });
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

  const orderId = 'GYM-' + Date.now() + '-' + member._id.toString().slice(-6);

  const existingPayment = await Payment.findOne({ member: member._id, status: 'pending' });
  if (!existingPayment) {
    await Payment.create({
      member: member._id,
      coach: coach._id,
      amount: fee,
      websiteFee: WEBSITE_FEE,
      totalAmount: total,
      status: 'pending',
      payhereOrderId: orderId
    });
  }

  const payhereMerchantId = process.env.PAYHERE_MERCHANT_ID;
  const payhereSecret = process.env.PAYHERE_SECRET;
  const currency = process.env.PAYHERE_CURRENCY || 'LKR';
  const amount = Number(total).toFixed(2);
  const hashedSecret = crypto.createHash('md5').update(payhereSecret).digest('hex').toUpperCase();
  const hash = crypto.createHash('md5')
    .update(payhereMerchantId + orderId + amount + currency + hashedSecret)
    .digest('hex')
    .toUpperCase();

  const baseUrl = process.env.BASE_URL || ('https://' + (process.env.VERCEL_URL || 'localhost:5000'));
  const returnUrl = baseUrl + '/member/success';
  const cancelUrl = baseUrl + '/member/cancel';
  const notifyUrl = baseUrl + '/payment/notify';
  const isSandbox = process.env.PAYHERE_SANDBOX === 'true' || payhereMerchantId.startsWith('1');
  const checkoutUrl = isSandbox ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout';

  res.render('member/payment', {
    coach,
    member,
    fee,
    websiteFee: WEBSITE_FEE,
    total,
    orderId,
    payhereMerchantId,
    currency,
    hash,
    returnUrl,
    cancelUrl,
    notifyUrl,
    checkoutUrl,
    messages: req.flash()
  });
});

router.get('/success', ensureAuth, async (req, res) => {
  const { order_id, payment_id, status_code } = req.query;

  if (status_code == '2') {
    const payment = await Payment.findOne({ payhereOrderId: order_id });
    if (payment && payment.status !== 'completed') {
      payment.status = 'completed';
      payment.payherePaymentId = payment_id;
      await payment.save();

      const member = await User.findById(payment.member);
      if (member) {
        req.session.user.selectedCoach = member.selectedCoach;
      }
    }
    req.flash('success', 'Payment successful! Coach contact details are now available.');
  } else {
    req.flash('error', 'Payment was not completed. Please try again.');
  }
  res.redirect('/member/dashboard');
});

router.get('/cancel', ensureAuth, async (req, res) => {
  req.flash('error', 'Payment cancelled.');
  res.redirect('/member/coaches');
});

module.exports = router;
