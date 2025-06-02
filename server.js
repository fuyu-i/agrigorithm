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


// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] - ${req.method} ${req.url}`);
  next();
});


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
      res.json({ message: 'User created successfully', userId: this.lastID});
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
    res.json({ message: 'Logged in successfully',
      userEmail: user.email,
      userId: user.id,
    });
  });
});

// Logout route
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Get user profile by id via query string
app.get('/api/user', (req, res) => {
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
app.put('/api/user/update', (req, res) => {
  const { userId, name, email, contact, city, province, region } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Error' });
  }

  const sql = `
    UPDATE users
    SET name = ?, email = ?, contact = ?, city = ?, province = ?, region = ?
    WHERE id = ?
  `;

  db.run(sql, [name, email, contact, city, province, region, userId], function(err) {
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


// === SEARCH ROUTES ===
// Boyer-Moore Algorithm Implementation (Server-side)
class BoyerMoore {
    constructor(pattern) {
        this.pattern = pattern.toLowerCase();
        this.badCharTable = this.buildBadCharTable();
    }

    buildBadCharTable() {
        const table = {};
        const pattern = this.pattern;
        
        for (let i = 0; i < pattern.length - 1; i++) {
            table[pattern[i]] = pattern.length - 1 - i;
        }
        
        return table;
    }

    search(text) {
        const textLower = text.toLowerCase();
        const pattern = this.pattern;
        const textLen = textLower.length;
        const patternLen = pattern.length;
        
        if (patternLen === 0) return [];
        
        const matches = [];
        let skip = 0;
        
        while (skip <= textLen - patternLen) {
            let j = patternLen - 1;
            
            while (j >= 0 && pattern[j] === textLower[skip + j]) {
                j--;
            }
            
            if (j < 0) {
                matches.push(skip);
                skip += patternLen;
            } else {
                const badChar = textLower[skip + j];
                skip += Math.max(1, this.badCharTable[badChar] || patternLen);
            }
        }
        
        return matches;
    }
}


// Search API endpoint
app.get('/api/search', (req, res) => {
    const query = req.query.q;
    
    if (!query || query.trim() === '') {
        return res.json({ products: [], producers: [] });
    }

    // Get products from database
    const productSql = `
        SELECT p.id, p.name, p.price, p.category, p.subcategory, p.variety, p.image_url,
               u.name as seller_name, u.shop_name, u.city, u.province, u.region
        FROM products p
        LEFT JOIN users u ON p.user_id = u.id
    `;

    // Get producers (users with products)
    const producersSql = `
        SELECT u.id, u.name, u.shop_name, u.city, u.province, u.region, COUNT(p.id) as product_count
        FROM users u
        INNER JOIN products p ON u.id = p.user_id
        GROUP BY u.id, u.name, u.shop_name, u.city, u.province, u.region
    `;

    Promise.all([
        new Promise((resolve, reject) => {
            db.all(productSql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }),
        new Promise((resolve, reject) => {
            db.all(producersSql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        })
    ])
    .then(([products, producers]) => {
        const boyerMoore = new BoyerMoore(query);
        const results = {
            products: [],
            producers: []
        };

        // Search products using Boyer-Moore
        products.forEach(product => {
            const searchText = `${product.name} ${product.seller_name || ''} ${product.shop_name || ''} ${product.category || ''} ${product.subcategory || ''} ${product.variety || ''} ${product.city || ''} ${product.province || ''} ${product.region || ''}`.toLowerCase();
            const matches = boyerMoore.search(searchText);
            
            if (matches.length > 0) {
                // Prioritize exact matches in product name
                const nameMatches = boyerMoore.search(product.name.toLowerCase());
                product.priority = nameMatches.length > 0 ? 1 : 2;
                results.products.push({
                    id: product.id,
                    name: product.name,
                    seller: product.shop_name || product.seller_name || 'Unknown Seller',
                    region: product.region || 'Unknown Region',
                    category: product.category || 'Uncategorized',
                    price: product.price,
                    subcategory: product.subcategory,
                    variety: product.variety,
                    city: product.city,
                    province: product.province,
                    image_url: product.image_url
                });
            }
        });

        // Search producers using Boyer-Moore
        producers.forEach(producer => {
            const searchText = `${producer.name} ${producer.shop_name || ''} ${producer.city || ''} ${producer.province || ''} ${producer.region || ''}`.toLowerCase();
            const matches = boyerMoore.search(searchText);
            
            if (matches.length > 0) {
                results.producers.push({
                    id: producer.id,
                    name: producer.shop_name || producer.name,
                    region: producer.region || 'Unknown Region',
                    productCount: producer.product_count,
                    city: producer.city,
                    province: producer.province
                });
            }
        });

        // Sort products by priority (exact matches first)
        results.products.sort((a, b) => a.priority - b.priority);

        res.json(results);
    })
    .catch(err => {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Search failed' });
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
