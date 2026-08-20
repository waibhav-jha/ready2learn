/**
 * =============================================================================
 * CLINIC & PLATFORM ADMIN DASHBOARD API
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('./auth');

// Optional Admin Token Gate (Allows seamless dev view with fallback)
function requireAdminOrDev(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    // In dev / single clinic mode, allow access
    return next();
  }
  const { JWT_SECRET } = require('./auth');
  const jwt = require('jsonwebtoken');
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return next();
    req.user = user;
    next();
  });
}

// 1. Get Live Statistics
router.get('/stats', requireAdminOrDev, (req, res) => {
  try {
    const stats = db.getAdminStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin stats: ' + err.message });
  }
});

// 2. Get Registered Users
router.get('/users', requireAdminOrDev, (req, res) => {
  try {
    const users = db.getAdminUsers();
    res.json({ users, total: users.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
  }
});

// 3. Get Waitlist Inquiries
router.get('/waitlist', requireAdminOrDev, (req, res) => {
  try {
    const waitlist = db.getAdminWaitlist();
    res.json({ waitlist, total: waitlist.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch waitlist: ' + err.message });
  }
});

// 4. Get Contact Messages
router.get('/messages', requireAdminOrDev, (req, res) => {
  try {
    const messages = db.getAdminMessages();
    res.json({ messages, total: messages.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages: ' + err.message });
  }
});

// 5. Get Store & Stage Unlock Orders
router.get('/orders', requireAdminOrDev, (req, res) => {
  try {
    const orders = db.getAdminOrders();
    res.json({ orders, total: orders.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders: ' + err.message });
  }
});

module.exports = router;
