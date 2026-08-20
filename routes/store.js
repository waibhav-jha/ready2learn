/**
 * =============================================================================
 * STORE, CHECKOUT & PAYMENT INTEGRATION ROUTES
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database/db');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// 1. Create Payment Order (for Stage Unlocks or Store Items)
router.post('/create-order', (req, res) => {
  try {
    const { amount, bandId, items, customerName, customerEmail } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const mockOrderId = 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    // Save pending order to database
    db.createStoreOrder({
      customerName,
      customerEmail: customerEmail || 'guest@ready2learn.app',
      items: items || (bandId ? [{ type: 'stage_unlock', bandId }] : []),
      totalAmount: amount,
      currency: 'INR'
    });

    res.json({
      keyId: RAZORPAY_KEY_ID,
      amount: amount,
      currency: 'INR',
      orderId: mockOrderId,
      bandId
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not initialize order: ' + err.message });
  }
});

// 2. Verify Payment & Record Order
router.post('/verify-payment', (req, res) => {
  try {
    const { orderId, paymentId, signature, bandId, email, items } = req.body;

    if (!orderId || !paymentId) {
      return res.status(400).json({ error: 'Missing orderId or paymentId for verification' });
    }

    // Signature verification (if secret configured)
    let verified = true;
    if (RAZORPAY_KEY_SECRET && signature) {
      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(orderId + '|' + paymentId)
        .digest('hex');
      verified = (generatedSignature === signature);
    }

    if (!verified) {
      return res.status(400).json({ error: 'Payment signature verification failed' });
    }

    // If this payment was for a Ready2Learn stage unlock
    let unlockResult = null;
    if (bandId) {
      unlockResult = db.recordPurchase({
        email: email || 'guest@ready2learn.app',
        bandId,
        orderId,
        paymentId,
        signature: signature || 'verified_sig',
        amount: 9900
      });
    }

    // Verify store order
    db.verifyStoreOrder({ orderId, paymentId, signature, email });

    const unlockedBands = bandId ? db.lookupPurchases(email || '') : [];

    res.json({
      verified: true,
      message: 'Payment verified and transaction recorded successfully',
      orderId,
      paymentId,
      bandId,
      unlockedBands,
      user: unlockResult ? unlockResult.user : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Payment verification failed: ' + err.message });
  }
});

// 3. Dev Sandbox Instant Test Payment Simulation
router.post('/dev/mock-payment', (req, res) => {
  try {
    const { bandId, email } = req.body;
    const targetEmail = email || 'dev_tester@ready2learn.app';
    const mockOrderId = 'dev_order_' + Date.now();
    const mockPaymentId = 'dev_pay_' + Date.now();

    const result = db.recordPurchase({
      email: targetEmail,
      bandId: bandId || 'a36',
      orderId: mockOrderId,
      paymentId: mockPaymentId,
      signature: 'dev_mock_signature',
      amount: 9900,
      isDevUnlock: 1
    });

    const unlockedBands = db.lookupPurchases(targetEmail);

    res.json({
      verified: true,
      isDevSimulation: true,
      message: 'Simulated payment succeeded in Dev Test mode.',
      bandId: bandId || 'a36',
      orderId: mockOrderId,
      paymentId: mockPaymentId,
      unlockedBands,
      user: result.user
    });
  } catch (err) {
    res.status(500).json({ error: 'Dev payment simulation error: ' + err.message });
  }
});

module.exports = router;
