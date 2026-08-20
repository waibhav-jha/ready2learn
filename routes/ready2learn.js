/**
 * =============================================================================
 * READY2LEARN KIDS DATA SYNC, UNLOCKS & DEV TESTING ROUTES
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken, JWT_SECRET } = require('./auth');

// Optional Token extractor
function extractOptionalToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, userPayload) => {
    req.user = err ? null : userPayload;
    next();
  });
}

// 1. Get user profile and milestone progress state
router.get('/sync', authenticateToken, (req, res) => {
  const user = db.findUserByEmail(req.user.email);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found' });
  }
  res.json({
    parentName: user.parentName,
    email: user.email,
    profile: user.profile,
    lastSyncedAt: user.lastSyncedAt
  });
});

// 2. Bi-directional cloud sync
router.post('/sync', authenticateToken, (req, res) => {
  try {
    const { parentName, childName, childDob, progress, unlockedBands } = req.body;

    const updatedUser = db.updateUserProfile(req.user.email, {
      parentName,
      childName,
      childDob,
      progress,
      unlockedBands
    });

    res.json({
      message: 'Cloud sync successful',
      user: updatedUser,
      syncedAt: updatedUser.lastSyncedAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync user data: ' + err.message });
  }
});

// 3. Restore previous purchases by email
router.post('/restore-purchase', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required to look up purchases' });
    }

    const unlockedBands = db.lookupPurchases(email);
    res.json({
      email,
      unlockedBands,
      count: unlockedBands.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to lookup purchases: ' + err.message });
  }
});

// 4. Dev Test Suite Action: Instant 1-Click Unlock All Stages
router.post('/dev/unlock-all', extractOptionalToken, (req, res) => {
  try {
    const { email } = req.body;
    const targetEmail = email || (req.user ? req.user.email : 'dev_tester@ready2learn.app');
    const allBands = ['a30', 'a36', 'a42', 'a48', 'a54', 'a60'];

    allBands.forEach(bandId => {
      db.recordPurchase({
        email: targetEmail,
        bandId,
        orderId: 'dev_mock_order_' + bandId,
        paymentId: 'dev_mock_pay_' + bandId,
        signature: 'dev_mock_signature',
        amount: 0,
        isDevUnlock: 1
      });
    });

    const user = db.findUserByEmail(targetEmail);
    res.json({
      success: true,
      message: 'All 6 Ready2Learn age stages unlocked in Dev Test mode.',
      unlockedBands: allBands,
      user: user ? db.sanitizeUser(user) : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to perform dev unlock: ' + err.message });
  }
});

// 5. Dev Test Suite Action: Seed Sample Realistic Child & Milestones
router.post('/dev/seed-child', extractOptionalToken, (req, res) => {
  try {
    const { email } = req.body;
    const sampleProfile = {
      childName: 'Aarav Jha',
      childDob: { day: 15, month: 8, year: 2023 }, // 3-year-old
      unlockedBands: ['a30', 'a36', 'a42', 'a48', 'a54', 'a60'],
      progress: {
        'a36_d1': { '0': 'achieved', '1': 'achieved', '2': 'emerging', '3': 'achieved', '4': 'emerging', '5': 'notyet' },
        'a36_d2': { '0': 'achieved', '1': 'achieved', '2': 'achieved', '3': 'emerging' },
        'a36_d3': { '0': 'achieved', '1': 'emerging', '2': 'notyet' },
        'chk_a36_d1_0': true,
        'chk_a36_d1_1': true,
        'win_a36_d1': 'Today he named all his toy cars and asked questions during bedtime story!'
      }
    };

    if (req.user || email) {
      const targetEmail = req.user ? req.user.email : email;
      db.updateUserProfile(targetEmail, {
        childName: sampleProfile.childName,
        childDob: sampleProfile.childDob,
        progress: sampleProfile.progress,
        unlockedBands: sampleProfile.unlockedBands
      });
    }

    res.json({
      success: true,
      message: 'Sample child profile and milestone records generated.',
      sampleProfile
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to seed sample data: ' + err.message });
  }
});

module.exports = router;
