// Hsandles user profile retrieval and updates.

const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Get user profile by id via query string
router.get('/', (req, res) => {
  const userId = req.query.id;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  db.get(
    'SELECT name, email, contact, city, province, region FROM users WHERE id = ?',
    [userId],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(row);
    }
  );
});

// Update user profile
router.put('/update', (req, res) => {
  const { userId, name, email, contact, city, province, region } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Error' });
  }

  const sql = `
    UPDATE users
    SET name = ?, email = ?, contact = ?, city = ?, province = ?, region = ?
    WHERE id = ?
  `;

  db.run(sql, [name, email, contact, city, province, region, userId], function (err) {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully' });
  });
});

module.exports = router;