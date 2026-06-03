require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const flash = require('connect-flash');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

const dbPromise = connectDB().catch(err => console.error('DB init error:', err.message));
app.use(async (req, res, next) => { await dbPromise; next(); });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'frontend', 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60
  }),
  cookie: { maxAge: 14 * 24 * 60 * 60 * 1000 }
}));

app.use(flash());

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.get('/', async (req, res) => {
  const User = require('./models/User');
  const totalCoaches = await User.countDocuments({ role: 'coach', status: 'approved' });
  const totalMembers = await User.countDocuments({ role: 'member', status: 'approved' });
  const filterDistrict = req.query.district || '';
  const filterCity = req.query.city || '';
  const coachQuery = { role: 'coach', status: 'approved' };
  if (filterDistrict) coachQuery.district = filterDistrict;
  if (filterCity) coachQuery.city = filterCity;
  const coaches = await User.find(coachQuery).sort({ createdAt: -1 }).limit(6);
  const districts = await User.distinct('district', { role: 'coach', status: 'approved', district: { $ne: '' } });
  const cities = filterDistrict ? await User.distinct('city', { role: 'coach', status: 'approved', district: filterDistrict, city: { $ne: '' } }) : [];
  res.render('index', { messages: req.flash(), stats: { coaches: totalCoaches, members: totalMembers }, coaches, districts, cities, filterDistrict, filterCity });
});

app.get('/coaches', async (req, res) => {
  const User = require('./models/User');
  const filterDistrict = req.query.district || '';
  const filterCity = req.query.city || '';
  const query = { role: 'coach', status: 'approved' };
  if (filterDistrict) query.district = filterDistrict;
  if (filterCity) query.city = filterCity;
  const coaches = await User.find(query).sort({ createdAt: -1 });
  const districts = await User.distinct('district', { role: 'coach', status: 'approved', district: { $ne: '' } });
  const cities = filterDistrict ? await User.distinct('city', { role: 'coach', status: 'approved', district: filterDistrict, city: { $ne: '' } }) : [];
  res.render('coaches', { coaches, districts, cities, filterDistrict, filterCity, messages: req.flash() });
});

app.get('/coach-profile/:id', async (req, res) => {
  const User = require('./models/User');
  const coach = await User.findById(req.params.id);
  if (!coach || coach.role !== 'coach' || coach.status !== 'approved') {
    req.flash('error', 'Coach not found');
    return res.redirect('/');
  }
  res.render('coach-profile', { coach, messages: req.flash() });
});

app.get('/coach-profile/:id/members-count', async (req, res) => {
  const Payment = require('./models/Payment');
  const count = await Payment.countDocuments({ coach: req.params.id, status: 'completed' });
  res.json({ count });
});

app.use('/', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/coach', require('./routes/coach'));
app.use('/member', require('./routes/member'));
app.use('/payment', require('./routes/payment'));
app.use('/feedback', require('./routes/feedback'));
app.use('/profile', require('./routes/profile'));

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
