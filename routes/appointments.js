/**
 * =============================================================================
 * CLINICAL APPOINTMENTS & WAITLIST INQUIRIES ROUTE
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Submit Consultation Waitlist Request
router.post('/waitlist', (req, res) => {
  try {
    const { parentName, email, phone, childName, childAge, concerns } = req.body;

    if (!parentName || !email) {
      return res.status(400).json({ error: 'Parent name and email address are required.' });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const entry = db.recordWaitlistEntry({
      parentName,
      email,
      phone,
      childName,
      childAge,
      concerns
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! You have been successfully added to Dr. Chitra Sankar’s waitlist. We will contact you shortly.',
      entry
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record waitlist entry: ' + err.message });
  }
});

module.exports = router;
