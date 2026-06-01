require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const existing = await User.findOne({ email: 'admin@fitlanka.lk' });
  if (existing) {
    console.log('Admin already exists');
  } else {
    await User.create({
      name: 'Admin',
      email: 'admin@fitlanka.lk',
      password: 'admin123',
      phone: '0770000000',
      role: 'admin',
      status: 'approved'
    });
    console.log('Admin created: admin@fitlanka.lk / admin123');
  }
  process.exit();
}).catch(err => { console.error(err); process.exit(1); });
