const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const { sendRegistrationNotification, sendLoginVerification } = require('../config/notifications');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/login', (req, res) => {
  res.render('login', { messages: req.flash() });
});

router.get('/register', (req, res) => {
  res.render('register', { messages: req.flash() });
});

router.post('/register', upload.array('certificates', 5), async (req, res) => {
  try {
    const { name, email, password, phone, role, experience, specialties, bio, ratePerMonth, age, gender, fitnessGoals, healthConditions } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash('error', 'Email already registered');
      return res.redirect('/register');
    }

    const userData = {
      name,
      email,
      password,
      phone,
      role
    };

    if (role === 'coach') {
      const certificates = [];
      if (req.files) {
        req.files.forEach(file => {
          certificates.push({ name: file.originalname, file: '' });
        });
      }
      userData.coachDetails = {
        certificates,
        experience,
        specialties: specialties ? (Array.isArray(specialties) ? specialties : [specialties]) : [],
        bio,
        ratePerMonth: Number(ratePerMonth) || 0,
        profileImage: ''
      };
    }

    if (role === 'member') {
      userData.memberDetails = { age, gender, fitnessGoals, healthConditions };
    }

    const user = await User.create(userData);
    sendRegistrationNotification(user);
    req.flash('success', 'Registration submitted! Check your email/SMS for confirmation. Wait for admin approval.');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Registration failed');
    res.redirect('/register');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/login');
    }

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    };

    sendLoginVerification(user);

    if (user.role === 'admin') return res.redirect('/admin/dashboard');
    if (user.role === 'coach') return res.redirect('/coach/dashboard');
    if (user.role === 'member') return res.redirect('/member/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Login failed');
    res.redirect('/login');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
