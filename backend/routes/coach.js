const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Payment = require('../models/Payment');
const { ensureAuth } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

let uploadImage;
try { ({ uploadImage } = require('../config/cloudinary')); } catch (e) {}

router.get('/dashboard', ensureAuth, async (req, res) => {
  if (req.session.user.role !== 'coach' && req.session.user.role !== 'gymOwner') return res.redirect('/login');

  const coach = await User.findById(req.session.user.id);
  const members = await Payment.find({ coach: coach._id, status: 'completed' }).populate('member', 'name email phone');
  res.render('coach/dashboard', { coach, members, messages: req.flash() });
});

router.post('/add-progress', ensureAuth, upload.array('progressPhotos', 5), async (req, res) => {
  try {
    if (req.session.user.role !== 'coach') return res.json({ error: 'Unauthorized' });

    const { memberName, notes } = req.body;
    const files = req.files || [];

    if (!memberName || files.length === 0) {
      return res.json({ error: 'Member name and at least one photo required' });
    }

    const photos = [];
    for (const f of files) {
      let url = '';
      if (uploadImage) {
        try { url = await uploadImage(f.buffer); } catch (e) { console.error('Cloudinary error:', e.message); }
      }
      if (!url) {
        url = 'data:' + f.mimetype + ';base64,' + f.buffer.toString('base64');
      }
      photos.push({ url, caption: '' });
    }

    const coach = await User.findById(req.session.user.id);
    coach.coachDetails.customerProgress.push({ memberName, photos, notes });
    await coach.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ error: 'Failed to add progress' });
  }
});

module.exports = router;
