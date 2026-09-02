const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: '✅ Database connected', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== USERS ====================
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, phone, role, avatar, registered_at FROM users ORDER BY registered_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id, name, email, phone, role, avatar, registered_at FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/sync', async (req, res) => {
  try {
    const { id, name, email, phone, role, avatar } = req.body;
    
    const result = await pool.query(
      `INSERT INTO users (id, name, email, phone, role, avatar, registered_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         role = EXCLUDED.role,
         avatar = EXCLUDED.avatar
       RETURNING *`,
      [id, name, email, phone || '', role || 'customer', avatar]
    );
    
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, promotional_emails } = req.body;
    
    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           promotional_emails = COALESCE($3, promotional_emails)
       WHERE id = $4
       RETURNING id, name, email, phone, role, avatar, promotional_emails, registered_at`,
      [name, phone, promotional_emails, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PRODUCTS ====================
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name_ar, name_en, description_ar, description_en, 
              price_jod, price_usd, category, image, images, 
              stock_quantity, rating, reviews_count, created_at 
       FROM products ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const {
      name_ar, name_en, description_ar, description_en,
      price_jod, price_usd, category, image, images,
      stock_quantity
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO products (name_ar, name_en, description_ar, description_en,
                             price_jod, price_usd, category, image, images, stock_quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name_ar, name_en, description_ar, description_en,
       price_jod, price_usd, category, image, images || [], stock_quantity || 0]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name_ar, name_en, description_ar, description_en,
      price_jod, price_usd, category, image, images,
      stock_quantity
    } = req.body;
    
    const result = await pool.query(
      `UPDATE products 
       SET name_ar = COALESCE($1, name_ar),
           name_en = COALESCE($2, name_en),
           description_ar = COALESCE($3, description_ar),
           description_en = COALESCE($4, description_en),
           price_jod = COALESCE($5, price_jod),
           price_usd = COALESCE($6, price_usd),
           category = COALESCE($7, category),
           image = COALESCE($8, image),
           images = COALESCE($9, images),
           stock_quantity = COALESCE($10, stock_quantity)
       WHERE id = $11
       RETURNING *`,
      [name_ar, name_en, description_ar, description_en,
       price_jod, price_usd, category, image, images || [], stock_quantity, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_quantity } = req.body;
    
    const result = await pool.query(
      'UPDATE products SET stock_quantity = $1 WHERE id = $2 RETURNING *',
      [stock_quantity, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ORDERS ====================
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const {
      user_id, order_number, items, subtotal_jod, subtotal_usd,
      discount_jod, discount_usd, shipping_cost_jod, shipping_cost_usd,
      total_jod, total_usd, payment_method, status, customer_name,
      customer_phone, customer_email, shipping_address, shipping_notes
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO orders (user_id, order_number, items, subtotal_jod, subtotal_usd,
                           discount_jod, discount_usd, shipping_cost_jod, shipping_cost_usd,
                           total_jod, total_usd, payment_method, status, customer_name,
                           customer_phone, customer_email, shipping_address, shipping_notes)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [user_id, order_number, JSON.stringify(items), subtotal_jod, subtotal_usd,
       discount_jod, discount_usd, shipping_cost_jod, shipping_cost_usd,
       total_jod, total_usd, payment_method, status || 'pending_payment',
       customer_name, customer_phone, customer_email, shipping_address, shipping_notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== REVIEWS ====================
app.get('/api/reviews/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(
      `SELECT r.*, u.name as user_name, u.avatar as user_avatar
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { product_id, user_id, rating, comment } = req.body;
    
    const result = await pool.query(
      `INSERT INTO reviews (product_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [product_id, user_id, rating, comment]
    );
    
    const avgResult = await pool.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count
       FROM reviews WHERE product_id = $1`,
      [product_id]
    );
    
    const avgRating = parseFloat(avgResult.rows[0].avg_rating) || 5;
    const count = parseInt(avgResult.rows[0].count) || 0;
    
    await pool.query(
      'UPDATE products SET rating = $1, reviews_count = $2 WHERE id = $3',
      [avgRating, count, product_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CART ====================
app.get('/api/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM carts WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows[0] || { user_id: userId, items: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { items } = req.body;
    
    const result = await pool.query(
      `INSERT INTO carts (user_id, items)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET items = EXCLUDED.items, updated_at = NOW()
       RETURNING *`,
      [userId, JSON.stringify(items)]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== WISHLIST ====================
app.get('/api/wishlist/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM wishlists WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows[0] || { user_id: userId, product_ids: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wishlist/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { product_ids } = req.body;
    
    const result = await pool.query(
      `INSERT INTO wishlists (user_id, product_ids)
       VALUES ($1, $2::text[])
       ON CONFLICT (user_id) DO UPDATE SET product_ids = EXCLUDED.product_ids
       RETURNING *`,
      [userId, product_ids]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
module.exports = app;
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? '✅ Connected' : '❌ Missing DATABASE_URL'}`);
});
