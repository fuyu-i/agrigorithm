// server.js
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) console.error('Database error:', err);
  else console.log('✅ Connected to SQLite DB');
});

// Create users table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`);

// Session middleware
app.use(session({
  store: new SQLiteStore,
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 } // 1 hour
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// === AUTH ROUTES ===

// Signup route
app.post('/api/auth/signup', async (req, res) => {
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

    db.run(stmt, [name, email, hashedPassword, contact, city, province, region], function(err) {
      if (err) {
        console.error('DB error:', err);
        return res.status(409).json({ error: 'Email already exists or DB error' });
      }
      req.session.userId = this.lastID;
      res.json({ message: 'User created successfully', userId: this.lastID, userEmail: email });
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Login route
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.userId = user.id;
    res.json({ message: 'Logged in successfully', userEmail: user.email });
  });
});

// Logout route
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Get user profile by email via query string
app.get('/api/user', (req, res) => {
    const email = req.query.email;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    db.get(
        'SELECT name, email, contact, city, province, region FROM users WHERE email = ?',
        [email],
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
app.put('/api/user/update', (req, res) => {
  const { name, email, contact, city, province, region } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required to update profile' });
  }

  const sql = `
    UPDATE users
    SET name = ?, contact = ?, city = ?, province = ?, region = ?
    WHERE email = ?
  `;

  db.run(sql, [name, contact, city, province, region, email], function(err) {
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



// Auth check
app.get('/api/auth/check', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true });
  } else {
    res.json({ loggedIn: false });
  }
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/pages/:page', (req, res) => {
  const page = req.params.page;
  const filePath = path.join(__dirname, 'pages', `${page}.html`);
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).send('Page not found');
  });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
