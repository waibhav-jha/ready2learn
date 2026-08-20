/**
 * =============================================================================
 * CONTACT MESSAGES & INQUIRIES ROUTE
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Submit Contact Message
router.post('/', (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const entry = db.recordContactMessage({
      name,
      email,
      subject,
      message
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been sent to Dr. Chitra Sankar’s clinic team. We will get back to you soon.',
      entry
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save message: ' + err.message });
  }
});

module.exports = router;
