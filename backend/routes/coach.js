const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Payment = require('../models/Payment');
const { ensureAuth } = require('../middleware/auth');

router.get('/dashboard', ensureAuth, async (req, res) => {
  if (req.session.user.role !== 'coach') return res.redirect('/login');

  const coach = await User.findById(req.session.user.id);
  const members = await Payment.find({ coach: coach._id, status: 'completed' }).populate('member', 'name email phone');
  res.render('coach/dashboard', { coach, members, messages: req.flash() });
});

module.exports = router;
