const ensureAuth = (req, res, next) => {
  if (req.session.user) return next();
  req.flash('error', 'Please login first');
  res.redirect('/login');
};

const ensureAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') return next();
  req.flash('error', 'Admin access required');
  res.redirect('/login');
};

const ensureCoach = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'coach' && req.session.user.status === 'approved') return next();
  req.flash('error', 'Coach access required');
  res.redirect('/login');
};

const ensureMember = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'member' && req.session.user.status === 'approved') return next();
  req.flash('error', 'Member access required');
  res.redirect('/login');
};

module.exports = { ensureAuth, ensureAdmin, ensureCoach, ensureMember };
