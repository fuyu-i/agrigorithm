// This module initializes a SQLite database connection and exports it for use in other parts of the application.

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize SQLite database
const db = new sqlite3.Database(path.join(__dirname, '..', 'agrigorithm.db'), (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Connected to SQLite DB');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});

module.exports = db;