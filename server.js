require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database/db');

// Modular Routers
const { router: authRouter } = require('./routes/auth');
const ready2learnRouter = require('./routes/ready2learn');
const storeRouter = require('./routes/store');
const appointmentsRouter = require('./routes/appointments');
const contactRouter = require('./routes/contact');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static frontend file serving
app.use(express.static(path.join(__dirname)));
app.use('/ready2learn', express.static(path.join(__dirname, 'ready2learn')));

// =============================================================================
// API ROUTE MOUNTING
// =============================================================================

// Auth Endpoints
app.use('/api/auth', authRouter);

// Ready2Learn Kids Tracker & Cloud Sync
app.use('/api/ready2learn', ready2learnRouter);
app.use('/api/user', ready2learnRouter); // Aliased for backwards compatibility

// Store, Checkout & Razorpay
app.use('/api/store', storeRouter);
app.use('/api', storeRouter); // Aliased (/api/create-order, /api/verify-payment, /api/restore-purchase)

// Clinical Appointments & Waitlist
app.use('/api/appointments', appointmentsRouter);

// Contact Inquiries
app.use('/api/contact', contactRouter);

// Clinic Admin Dashboard
app.use('/api/admin', adminRouter);

// Health Check & Diagnostic
app.get('/api/health', (req, res) => {
  const stats = db.getAdminStats();
  res.json({
    status: 'ok',
    service: 'Dr. Chitra Sankar & Ready2Learn Clinical Platform',
    database: stats.databaseType,
    totalUsers: stats.totalUsers,
    totalWaitlist: stats.totalWaitlist,
    timestamp: new Date().toISOString()
  });
});

// Screener Clean URLs
app.get(['/screener', '/social-communication-screener', '/mchat'], (req, res) => {
  res.sendFile(path.join(__dirname, 'social-communication-screener.html'));
});

// Connect2Child Clean URLs
app.get(['/connect2child', '/connect-to-child', '/c2c'], (req, res) => {
  res.sendFile(path.join(__dirname, 'connect2child.html'));
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server exception:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred.'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 Ready2Learn & Dr. Chitra Sankar Full Platform Server Started`);
  console.log(`🌐 Port: ${PORT}`);
  console.log(`👶 Ready2Learn Kids App: http://localhost:${PORT}/ready2learn/Ready2LearnKids_App.html`);
  console.log(`📋 Screener Tool:        http://localhost:${PORT}/social-communication-screener.html`);
  console.log(`🤝 Connect2Child App:    http://localhost:${PORT}/connect2child.html`);
  console.log(`🏥 Clinic Website:        http://localhost:${PORT}/index.html`);
  console.log(`📊 Admin Dashboard:       http://localhost:${PORT}/admin.html`);
  console.log(`================================================================`);
});

module.exports = app;
