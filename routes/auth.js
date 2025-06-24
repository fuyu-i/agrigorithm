// This file handles user authentication routes including signup, login, logout, and session check.

const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');

const router = express.Router();

// Signup route
router.post('/signup', async (req, res) => {
  const { name, email, password, contact, city, province, region } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = `
      INSERT INTO users (name, email, password, contact, city, province, region)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(stmt, [name, email, hashedPassword, contact, city, province, region], function (err) {
      if (err) {
        console.error('DB error:', err);
        return res.status(409).json({ error: 'Email already exists or DB error' });
      }
      req.session.userId = this.lastID;
      res.json({ message: 'User created successfully', userId: this.lastID });
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login route
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.userId = user.id;
    res.json({
      message: 'Logged in successfully',
      userEmail: user.email,
      userId: user.id,
    });
  });
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Auth check
router.get('/check', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;