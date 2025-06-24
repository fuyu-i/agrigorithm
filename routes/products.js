// Routes for managing products, including fetching featured products, searching, filtering by region and category, and sorting.

const express = require('express');
const db = require('../config/database');
const BoyerMoore = require('../utils/boyerMoore');
const { mergeSort } = require('../utils/mergeSort');
const { getDetailedRegionName } = require('../utils/regionHelpers');

const router = express.Router();

// Get featured products (5 random products)
router.get('/featured', (req, res) => {
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

// Get all products with optional search, region, category filters and sorting
router.get('/', (req, res) => {
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
      regionName: getDetailedRegionName(row.region),
      dateAdded: row.dateAdded,
      stockQuantity: 100, // Default stock, no field in DB
      relevanceScore: 0
    }));

    // Apply Boyer-Moore search filter if search query is provided
    if (search && search.trim() !== '') {
      const boyerMoore = new BoyerMoore(search.trim());
      const filteredProducts = [];

      products.forEach(product => {
        let relevanceScore = 0;
        let hasMatch = false;
        let priority = 2;

        // Check for matches in product name (highest priority)
        const nameMatches = boyerMoore.search(product.name.toLowerCase());
        if (nameMatches.length > 0) {
          relevanceScore += 100;
          hasMatch = true;
          priority = 1;
          
          // Bonus for exact match
          if (product.name.toLowerCase() === search.trim().toLowerCase()) {
            relevanceScore += 50;
          }
          // Bonus for match at beginning
          if (nameMatches[0] === 0) {
            relevanceScore += 25;
          }
        }

        // Check for matches in seller name
        if (product.seller && boyerMoore.search(product.seller.toLowerCase()).length > 0) {
          relevanceScore += 15;
          hasMatch = true;
        }

        // Check for matches in category fields
        if (product.category && boyerMoore.search(product.category.toLowerCase()).length > 0) {
          relevanceScore += 10;
          hasMatch = true;
        }

        // Check for matches in subcategory
        if (product.subcategory && boyerMoore.search(product.subcategory.toLowerCase()).length > 0) {
          relevanceScore += 8;
          hasMatch = true;
        }

        // Check for matches in variety
        if (product.variety && boyerMoore.search(product.variety.toLowerCase()).length > 0) {
          relevanceScore += 8;
          hasMatch = true;
        }

        // Check for matches in description
        if (product.description && boyerMoore.search(product.description.toLowerCase()).length > 0) {
          relevanceScore += 5;
          hasMatch = true;
        }

        if (hasMatch) {
          product.relevanceScore = relevanceScore;
          product.priority = priority;
          filteredProducts.push(product);
        }
      });

      products = filteredProducts;
    }

    // Apply sorting using merge sort based on sort parameter
    if (search && search.trim() !== '') {
      switch (sort) {
        case 'relevance':
          mergeSort(products, 0, products.length - 1, (a, b) => {
            // Sort by priority (name matches first)
            if (a.priority !== b.priority) {
              return a.priority - b.priority;
            }
            // Sort by relevance score
            return b.relevanceScore - a.relevanceScore;
          });
          break;
        case 'newest':
          mergeSort(products, 0, products.length - 1, (a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
          break;
        case 'price-low':
          mergeSort(products, 0, products.length - 1, (a, b) => a.price - b.price);
          break;
        case 'price-high':
          mergeSort(products, 0, products.length - 1, (a, b) => b.price - a.price);
          break;
        case 'name':
          mergeSort(products, 0, products.length - 1, (a, b) => a.name.localeCompare(b.name));
          break;
        default:
          // Default to newest for search results
          mergeSort(products, 0, products.length - 1, (a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
          break;
      }
    } else {
      // When not searching, apply normal sorting
      switch (sort) {
        case 'price-low':
          mergeSort(products, 0, products.length - 1, (a, b) => a.price - b.price);
          break;
        case 'price-high':
          mergeSort(products, 0, products.length - 1, (a, b) => b.price - a.price);
          break;
        case 'name':
          mergeSort(products, 0, products.length - 1, (a, b) => a.name.localeCompare(b.name));
          break;
        case 'newest':
        default:
          mergeSort(products, 0, products.length - 1, (a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
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
router.get('/categories', (req, res) => {
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

module.exports = router;