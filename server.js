const path = require('path');
const express = require('express');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const opportunityRoutes = require('./routes/opportunities');
const applicationRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  session({
    secret: 'increment1-dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }, // 8 hours
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);

app.use(express.static(path.join(__dirname, 'public')));

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Faculty Research Finder running on http://localhost:${PORT}`);
  });
}

module.exports = app;
