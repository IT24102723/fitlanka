const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const { ensureAuth } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { type, coach } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (coach) filter.coach = coach;

    const feedbacks = await Feedback.find(filter)
      .populate('coach', 'name')
      .sort({ createdAt: -1 });
    const coaches = await User.find({ role: 'coach', status: 'approved' }, 'name');

    res.json({ feedbacks, coaches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, type, coachId, rating, message } = req.body;

    if (!name || !email || !type || !rating || !message) {
      return res.json({ success: false, error: 'All fields required' });
    }

    const data = { name, email, type, rating: Number(rating), message };
    if (type === 'coach' && coachId) data.coach = coachId;

    await Feedback.create(data);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
