// Routes for managing local producers, including fetching random producers and filtering by search or region.

const express = require('express');
const db = require('../config/database');
const BoyerMoore = require('../utils/boyerMoore');
const { getDetailedRegionName, getRandomBgColor } = require('../utils/regionHelpers');

const router = express.Router();

// Get 4 random local producers
router.get('/random', (req, res) => {
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
    res.json(rows.map(producer => {
      const producerName = producer.shop_name || producer.name;
      return {
        id: producer.id,
        name: producerName,
        city: producer.city,
        province: producer.province,
        region: producer.region,
        productCount: producer.product_count,
        avatar: producerName.split(' ').map(w => w[0]).join('').toUpperCase(),
        bgColor: getRandomBgColor()
      };
    }));
  });
});

// Get all producers with optional search and region filter
router.get('/', (req, res) => {
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

    let producers = rows.map(row => ({
      id: row.id,
      name: row.name,
      region: row.region,
      regionName: getDetailedRegionName(row.region),
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
        // Check name first (highest priority)
        if (boyerMoore.search(producer.name).length > 0) {
          producer.searchPriority = 1;
          return true;
        }

        // Check other fields if name doesn't match
        const otherFields = `${producer.regionName} ${producer.categories.join(' ')} ${producer.contact || ''} ${producer.email || ''}`;
        if (boyerMoore.search(otherFields).length > 0) {
          producer.searchPriority = 2;
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

module.exports = router;