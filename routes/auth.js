/**
 * =============================================================================
 * AUTHENTICATION & USER MANAGEMENT ROUTES
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'chitra_sankar_pediatric_secret_2026_jwt_token_key';

// Middleware for authenticated endpoints
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please sign in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, userPayload) => {
    if (err) {
      return res.status(403).json({ error: 'Session has expired or is invalid. Please sign in again.' });
    }
    req.user = userPayload;
    next();
  });
}

// 1. Sign Up / Register
router.post('/signup', async (req, res) => {
  try {
    const { email, password, parentName, childName, childDob, initialProgress, initialUnlocked } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const newUser = await db.createUser({
      email,
      password,
      parentName,
      childName,
      childDob,
      initialProgress,
      initialUnlocked
    });

    const token = jwt.sign(
      { email: newUser.email, id: newUser.id, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: newUser
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// 2. Log In
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.validateCredentials(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { email: user.email, id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Logged in successfully',
      token,
      user
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed due to server error: ' + err.message });
  }
});

// 3. Current User Profile
router.get('/me', authenticateToken, (req, res) => {
  const user = db.findUserByEmail(req.user.email);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found' });
  }
  res.json({ user: db.sanitizeUser(user) });
});

// 4. Update Profile
router.post('/update-profile', authenticateToken, (req, res) => {
  try {
    const { parentName, childName, childDob } = req.body;
    const updated = db.updateUserProfile(req.user.email, {
      parentName,
      childName,
      childDob
    });
    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
});

module.exports = {
  router,
  authenticateToken,
  JWT_SECRET
};
