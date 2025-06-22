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


// Get 4 random local producers
app.get('/api/producers/random', (req, res) => {
  const sql = `
    SELECT u.id, u.name, u.shop_name, u.city, u.province, u.region, COUNT(p.id) as product_count
    FROM users u
    INNER JOIN products p ON u.id = p.user_id
    GROUP BY u.id
    ORDER BY RANDOM()
    LIMIT 4
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching producers:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows.map(producer => ({
      id: producer.id,
      name: producer.shop_name || producer.name,
      city: producer.city,
      province: producer.province,
      region: producer.region,
      productCount: producer.product_count
    })));
  });
});

// Get featured products (5 random products)
app.get('/api/products/featured', (req, res) => {
  const sql = `
    SELECT 
      p.id, p.name, p.price, p.image_url, u.shop_name
    FROM products p
    JOIN users u ON p.user_id = u.id
    ORDER BY RANDOM()
    LIMIT 5
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching featured products:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(rows.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url,
      producer: product.shop_name,
      unit: 'kg'
    })));
  });
});


// Get all producers with optional search and region filter
app.get('/api/producers', (req, res) => {
  const { search, region, page = 1, limit = 12 } = req.query;
  let sql = `
    SELECT 
      u.id, 
      u.shop_name AS name, 
      u.region, 
      u.contact, 
      u.email, 
      COUNT(p.id) AS productCount,
      GROUP_CONCAT(DISTINCT p.category) AS categories
    FROM users u
    LEFT JOIN products p ON u.id = p.user_id
    WHERE u.shop_name IS NOT NULL
  `;

  const params = [];

  // Add region filter if provided
  if (region && region.trim() !== '') {
    sql += ` AND u.region = ?`;
    params.push(region);
  }

  sql += ` GROUP BY u.id`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Error fetching producers:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const regionMap = {
      'Ilocos Region': 'Region 1 - Ilocos Region',
      'Cagayan Valley': 'Region 2 - Cagayan Valley',
      'Central Luzon': 'Region 3 - Central Luzon',
      'CALABARZON': 'Region 4A - CALABARZON',
      'MIMAROPA Region': 'Region 4B - MIMAROPA',
      'Bicol Region': 'Region 5 - Bicol Region',
      'Western Visayas': 'Region 6 - Western Visayas',
      'Central Visayas': 'Region 7 - Central Visayas',
      'Eastern Visayas': 'Region 8 - Eastern Visayas',
      'Zamboanga Peninsula': 'Region 9 - Zamboanga Peninsula',
      'Northern Mindanao': 'Region 10 - Northern Mindanao',
      'Davao Region': 'Region 11 - Davao Region',
      'SOCCSKSARGEN': 'Region 12 - SOCCSKSARGEN',
      'Caraga': 'Region 13 - Caraga',
      'CAR': 'CAR - Cordillera Administrative Region',
      'National Capital Region': 'NCR - National Capital Region',
      'BARMM': 'BARMM - Bangsamoro Autonomous Region in Muslim Mindanao'
    };

    function getRandomBgColor() {
      const colors = [
        'from-primary-light to-primary',
        'from-success to-primary',
        'from-warning to-success',
        'from-info to-primary',
        'from-primary to-info'
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    }

    let producers = rows.map(row => ({
      id: row.id,
      name: row.name,
      region: row.region,
      regionName: regionMap[row.region] || 'Unknown Region',
      productCount: row.productCount || 0,
      categories: row.categories ? row.categories.split(',') : [],
      contact: row.contact,
      email: row.email,
      avatar: (row.name || '').split(' ').map(w => w[0]).join('').toUpperCase(),
      bgColor: getRandomBgColor()
    }));

    // Apply search filter using Boyer-Moore if search query is provided
    if (search && search.trim() !== '') {
      const boyerMoore = new BoyerMoore(search.trim());

      producers = producers.filter(producer => {
        const searchText = `${producer.name} ${producer.regionName} ${producer.categories.join(' ')} ${producer.contact || ''} ${producer.email || ''}`;
        const matches = boyerMoore.search(searchText);

        if (matches.length > 0) {
          const nameMatches = boyerMoore.search(producer.name);
          producer.searchPriority = nameMatches.length > 0 ? 1 : 2;
          return true;
        }
        return false;
      });

      producers.sort((a, b) => (a.searchPriority || 3) - (b.searchPriority || 3));
    }

    // Handle pagination or return all results
    if (req.query.page) {
      const totalItems = producers.length;
      const totalPages = Math.ceil(totalItems / limit);
      const offset = (page - 1) * limit;
      const paginatedProducers = producers.slice(offset, offset + parseInt(limit));

      res.json({
        producers: paginatedProducers,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems,
          itemsPerPage: parseInt(limit),
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } else {
      // Return all results (backward compatibility)
      res.json(producers);
    }
  });
});


// Get all products with optional search, region, category filters and sorting
app.get('/api/products', (req, res) => {
  const { search, region, category, sort = 'newest', page = 1, limit = 12 } = req.query;
  
  let sql = `
    SELECT 
      p.id,
      p.name,
      p.description,
      p.price,
      p.category,
      p.subcategory,
      p.variety,
      p.image_url,
      p.created_at as dateAdded,
      u.shop_name as seller,
      u.region,
      u.city,
      u.province,
      u.id as seller_id
    FROM products p
    INNER JOIN users u ON p.user_id = u.id
    WHERE u.shop_name IS NOT NULL
  `;

  const params = [];

  // Add region filter if provided
  if (region && region.trim() !== '') {
    sql += ` AND u.region = ?`;
    params.push(region);
  }

  // Add category filter if provided
  if (category && category.trim() !== '') {
    sql += ` AND p.category = ?`;
    params.push(category);
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Error fetching products:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const regionMap = {
      'Ilocos Region': 'Region 1 - Ilocos Region',
      'Cagayan Valley': 'Region 2 - Cagayan Valley',
      'Central Luzon': 'Region 3 - Central Luzon',
      'CALABARZON': 'Region 4A - CALABARZON',
      'MIMAROPA Region': 'Region 4B - MIMAROPA',
      'Bicol Region': 'Region 5 - Bicol Region',
      'Western Visayas': 'Region 6 - Western Visayas',
      'Central Visayas': 'Region 7 - Central Visayas',
      'Eastern Visayas': 'Region 8 - Eastern Visayas',
      'Zamboanga Peninsula': 'Region 9 - Zamboanga Peninsula',
      'Northern Mindanao': 'Region 10 - Northern Mindanao',
      'Davao Region': 'Region 11 - Davao Region',
      'SOCCSKSARGEN': 'Region 12 - SOCCSKSARGEN',
      'Caraga': 'Region 13 - Caraga',
      'CAR': 'CAR - Cordillera Administrative Region',
      'National Capital Region': 'NCR - National Capital Region',
      'BARMM': 'BARMM - Bangsamoro Autonomous Region in Muslim Mindanao'
    };

    let products = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      unit: 'kg', // Default unit
      category: row.category,
      subcategory: row.subcategory,
      variety: row.variety,
      image: row.image_url || '/images/placeholder-product.jpg',
      seller: row.seller,
      sellerId: row.seller_id,
      region: row.region,
      city: row.city,
      province: row.province,
      regionName: regionMap[row.region] || row.region,
      dateAdded: row.dateAdded,
      stockQuantity: 100, // Default stock, no field in DB
      relevanceScore: 0
    }));

    // Apply Boyer-Moore search filter if search query is provided
    if (search && search.trim() !== '') {
      const boyerMoore = new BoyerMoore(search.trim());
      const filteredProducts = [];

      products.forEach(product => {
        // Create search text combining all searchable fields
        const searchText = `${product.name} ${product.description || ''} ${product.category || ''} ${product.subcategory || ''} ${product.variety || ''} ${product.seller || ''}`.toLowerCase();
        const matches = boyerMoore.search(searchText);

        if (matches.length > 0) {
          // Calculate relevance score based on where matches are found
          let relevanceScore = 0;
          
          // Check for matches in product name (highest priority)
          const nameMatches = boyerMoore.search(product.name.toLowerCase());
          if (nameMatches.length > 0) {
            relevanceScore += 100;
            // Bonus for exact match
            if (product.name.toLowerCase() === search.trim().toLowerCase()) {
              relevanceScore += 50;
            }
            // Bonus for match at beginning
            if (nameMatches.includes(0)) {
              relevanceScore += 25;
            }
          }

          // Check for matches in seller name
          const sellerMatches = boyerMoore.search((product.seller || '').toLowerCase());
          if (sellerMatches.length > 0) {
            relevanceScore += 15;
          }

          // Check for matches in category fields
          const categoryMatches = boyerMoore.search((product.category || '').toLowerCase());
          if (categoryMatches.length > 0) {
            relevanceScore += 10;
          }

          const subcategoryMatches = boyerMoore.search((product.subcategory || '').toLowerCase());
          if (subcategoryMatches.length > 0) {
            relevanceScore += 8;
          }

          const varietyMatches = boyerMoore.search((product.variety || '').toLowerCase());
          if (varietyMatches.length > 0) {
            relevanceScore += 8;
          }

          // Check for matches in description
          const descriptionMatches = boyerMoore.search((product.description || '').toLowerCase());
          if (descriptionMatches.length > 0) {
            relevanceScore += 5;
          }

          product.relevanceScore = relevanceScore;
          product.priority = nameMatches.length > 0 ? 1 : 2;
          filteredProducts.push(product);
        }
      });

      products = filteredProducts;

      // Sort by relevance when searching (unless another sort is specified)
      if (sort === 'relevance' || sort === 'newest') {
        products.sort((a, b) => {
          // Sort by priority (name matches first)
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          // Sort by relevance score
          return b.relevanceScore - a.relevanceScore;
        });
      }
    }

    // Apply other sorting options
    if (!search) {
      switch (sort) {
        case 'price-low':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          products.sort((a, b) => b.price - a.price);
          break;
        case 'name':
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'newest':
        default:
          products.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
          break;
      }
    } else if (search && sort !== 'newest' && sort !== 'relevance') {
      switch (sort) {
        case 'price-low':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          products.sort((a, b) => b.price - a.price);
          break;
        case 'name':
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
      }
    }

    // Handle pagination
    if (req.query.page) {
      const totalItems = products.length;
      const totalPages = Math.ceil(totalItems / limit);
      const offset = (page - 1) * limit;
      const paginatedProducts = products.slice(offset, offset + parseInt(limit));

      res.json({
        products: paginatedProducts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems,
          itemsPerPage: parseInt(limit),
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } else {
      // Return all results (backward compatibility)
      res.json(products);
    }
  });
});

// Get product categories
app.get('/api/products/categories', (req, res) => {
  const sql = `
    SELECT DISTINCT category 
    FROM products 
    WHERE category IS NOT NULL AND category != ''
    ORDER BY category ASC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching categories:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const categories = rows.map(row => row.category);
    res.json(categories);
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
