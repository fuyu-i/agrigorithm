// Search API for products and producers

const express = require('express');
const db = require('../config/database');
const BoyerMoore = require('../utils/boyerMoore');
const { getSearchableRegionText } = require('../utils/regionHelpers');

const router = express.Router();

// Search API endpoint
router.get('/', (req, res) => {
  const query = req.query.q;

  if (!query || query.trim() === '') {
    return res.json({ products: [], producers: [] });
  }

  // Get products from database
  const productSql = `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.category,
          p.subcategory,
          p.variety,
          p.image_url,
          u.name as seller_name,
          u.shop_name,
          u.city,
          u.province,
          u.region
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
        let priority = 4;
        let hasMatch = false;

        // Check priority fields first (highest to lowest priority)
        
        // Priority 1: exact match in name
        if (boyerMoore.search(product.name.toLowerCase()).length > 0) {
          priority = 1;
          hasMatch = true;
        }
        // Priority 2: match in description
        else if (product.description && boyerMoore.search(product.description.toLowerCase()).length > 0) {
          priority = 2;
          hasMatch = true;
        }
        // Priority 3: match in region
        else {
          const regionText = getSearchableRegionText(product.region);
          if (boyerMoore.search(regionText.toLowerCase()).length > 0) {
            priority = 3;
            hasMatch = true;
          }
          // Priority 4: match elsewhere (only if no higher priority match found)
          else {
            const otherFields = `${product.seller_name || ''} ${product.shop_name || ''} ${product.category || ''} ${product.subcategory || ''} ${product.variety || ''} ${product.city || ''} ${product.province || ''}`.toLowerCase();
            if (boyerMoore.search(otherFields).length > 0) {
              hasMatch = true;
            }
          }
        }

        if (hasMatch) {
          results.products.push({
            id: product.id,
            name: product.name,
            description: product.description,
            seller: product.shop_name || product.seller_name || 'Unknown Seller',
            region: product.region || 'Unknown Region',
            category: product.category || 'Uncategorized',
            price: product.price,
            subcategory: product.subcategory,
            variety: product.variety,
            city: product.city,
            province: product.province,
            image_url: product.image_url,
            priority: priority
          });
        }
      });

      // Search producers using Boyer-Moore
      producers.forEach(producer => {
        const regionText = getSearchableRegionText(producer.region);
        const searchText = `${producer.name} ${producer.shop_name || ''} ${producer.city || ''} ${producer.province || ''} ${regionText}`.toLowerCase();
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

      // Sort products by priority (exact matches first, then description matches, then region matches, then others)
      results.products.sort((a, b) => a.priority - b.priority);

      res.json(results);
    })
    .catch(err => {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Search failed' });
    });
});

module.exports = router;