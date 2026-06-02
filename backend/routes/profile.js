const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const { ensureAuth } = require('../middleware/auth');
const upload = multer({ storage: multer.memoryStorage() });

let uploadImage;
try { ({ uploadImage } = require('../config/cloudinary')); } catch (e) {}

router.get('/', ensureAuth, async (req, res) => {
  const user = await User.findById(req.session.user.id).populate('selectedCoach', 'name');
  res.render('profile', { user, messages: req.flash() });
});

router.post('/', ensureAuth, upload.fields([{ name: 'profileImage', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.session.user.id;
    const user = await User.findById(userId);

    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/profile');
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ email, _id: { $ne: userId } });
      if (existing) {
        req.flash('error', 'Email already in use');
        return res.redirect('/profile');
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;

    const photoFile = req.files?.profileImage?.[0];
    if (photoFile) {
      if (uploadImage) {
        try { user.profileImage = await uploadImage(photoFile.buffer); } catch (e) { console.error('Cloudinary error:', e.message); }
      }
      if (!user.profileImage) {
        user.profileImage = 'data:' + photoFile.mimetype + ';base64,' + photoFile.buffer.toString('base64');
      }
    }

    await user.save();

    req.session.user.name = user.name;
    req.session.user.email = user.email;

    req.flash('success', 'Profile updated successfully');
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update profile');
    res.redirect('/profile');
  }
});

module.exports = router;
