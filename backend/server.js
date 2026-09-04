const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { hasPermission, normalizePermissions } = require("./permissions");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? null : "qwader-local-dev");

// Middleware
app.use(cors());
app.use(express.json());

const authenticate = async (req, res, next) => {
  if (!JWT_SECRET) return res.status(503).json({ error: "Server authentication is not configured" });
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const claims = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      "SELECT id, name, email, phone, role, avatar, permissions, registered_at FROM users WHERE id = $1",
      [claims.sub],
    );
    if (!result.rows[0]) return res.status(401).json({ error: "User session is no longer valid" });
    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
};

const requirePermission = (permission) => (req, res, next) => {
  if (!hasPermission(req.user, permission)) {
    return res.status(403).json({ error: "You do not have permission for this operation" });
  }
  next();
};

const protectWrite = (permission) => [authenticate, requirePermission(permission)];

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

// ==================== HEALTH CHECK ====================
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "✅ Database connected", time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const ensureStoreConfigTable = () => pool.query(`
  CREATE TABLE IF NOT EXISTS store_config (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP DEFAULT NOW()
  );
  INSERT INTO store_config (id, data) VALUES ('default', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
`);

app.get("/api/store-config", async (req, res) => {
  try {
    await ensureStoreConfigTable();
    const result = await pool.query("SELECT data FROM store_config WHERE id='default'");
    res.json(result.rows[0]?.data || {});
  } catch (error) { res.status(500).json({ error: "Unable to load store configuration" }); }
});

app.put("/api/store-config", ...protectWrite("settings.manage"), async (req, res) => {
  try {
    await ensureStoreConfigTable();
    const current = (await pool.query("SELECT data FROM store_config WHERE id='default'")).rows[0]?.data || {};
    const incoming = req.body && typeof req.body === "object" ? req.body : {};
    const data = { ...current, ...incoming, settings: { ...(current.settings || {}), ...(incoming.settings || {}) }, promoCodes: Array.isArray(incoming.promoCodes) ? incoming.promoCodes : current.promoCodes || [] };
    const result = await pool.query("UPDATE store_config SET data=$1::jsonb, updated_at=NOW() WHERE id='default' RETURNING data", [JSON.stringify(data)]);
    res.json(result.rows[0].data);
  } catch (error) { res.status(500).json({ error: "Unable to save store configuration" }); }
});

app.get("/api/auth/me", authenticate, (req, res) => res.json({ user: req.user }));

// ==================== USERS ====================
app.get("/api/users", ...protectWrite("customers.manage"), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, role, avatar, permissions, registered_at FROM users ORDER BY registered_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (id !== req.user.id && !hasPermission(req.user, "customers.manage")) return res.status(403).json({ error: "Not allowed" });
    const result = await pool.query(
      "SELECT id, name, email, phone, role, avatar, registered_at FROM users WHERE id = $1",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users/sync", async (req, res) => {
  try {
    const { id, name, email, phone, role, avatar } = req.body;

    if (!id || !name || !email) return res.status(400).json({ error: "id, name and email are required" });
    const result = await pool.query(
      `INSERT INTO users (id, name, email, phone, role, avatar, permissions, registered_at)
       VALUES ($1, $2, $3, $4, 'customer', $5, '[]'::jsonb, NOW())
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         avatar = EXCLUDED.avatar
       RETURNING id, name, email, phone, role, avatar, permissions, registered_at`,
      [id, name, email, phone || "", avatar],
    );
    const user = result.rows[0];
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "12h" });
    res.json({ success: true, user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (id !== req.user.id && !hasPermission(req.user, "customers.manage")) return res.status(403).json({ error: "Not allowed" });
    const { name, phone, promotional_emails } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           promotional_emails = COALESCE($3, promotional_emails)
       WHERE id = $4
       RETURNING id, name, email, phone, role, avatar, promotional_emails, registered_at`,
      [name, phone, promotional_emails, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id/role", ...protectWrite("staff.manage"), async (req, res) => {
  try {
    const { role, permissions = [] } = req.body;
    if (!["owner", "staff", "customer"].includes(role)) return res.status(400).json({ error: "Invalid role" });
    if (role === "owner" && req.user.role !== "owner") return res.status(403).json({ error: "Only the owner can assign owner access" });
    const normalized = normalizePermissions(permissions);
    const result = await pool.query(
      "UPDATE users SET role = $1, permissions = $2::jsonb, updated_at = NOW() WHERE id = $3 RETURNING id, name, email, phone, role, permissions, registered_at",
      [role, JSON.stringify(role === "owner" ? [...normalizePermissions(normalized)] : normalized), req.params.id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Unable to update staff permissions" });
  }
});

app.delete("/api/users/:id", ...protectWrite("customers.manage"), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PRODUCTS ====================
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name_ar, name_en, description_ar, description_en, 
              price_jod, price_usd, category, image, images, 
              stock_quantity, rating, reviews_count, created_at 
       FROM products ORDER BY created_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [
      id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", ...protectWrite("products.manage"), async (req, res) => {
  try {
    const {
      name_ar,
      name_en,
      description_ar,
      description_en,
      price_jod,
      price_usd,
      category,
      image,
      images,
      stock_quantity,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO products (name_ar, name_en, description_ar, description_en,
                             price_jod, price_usd, category, image, images, stock_quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name_ar,
        name_en,
        description_ar,
        description_en,
        price_jod,
        price_usd,
        category,
        image,
        images || [],
        stock_quantity || 0,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", ...protectWrite("products.manage"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name_ar,
      name_en,
      description_ar,
      description_en,
      price_jod,
      price_usd,
      category,
      image,
      images,
      stock_quantity,
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
      [
        name_ar,
        name_en,
        description_ar,
        description_en,
        price_jod,
        price_usd,
        category,
        image,
        images || [],
        stock_quantity,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", ...protectWrite("products.manage"), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM products WHERE id = $1", [id]);
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/products/:id/stock", ...protectWrite("products.manage"), async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_quantity } = req.body;

    const result = await pool.query(
      "UPDATE products SET stock_quantity = $1 WHERE id = $2 RETURNING *",
      [stock_quantity, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ORDERS ====================
app.get("/api/orders", ...protectWrite("orders.manage"), async (req, res) => {
  try {
    await pool.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_jod NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_usd NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_jod NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_usd NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost_jod NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost_usd NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_jod NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_usd NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash_pickup';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_payment';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT '';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT DEFAULT '';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT DEFAULT '';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_type TEXT DEFAULT 'pickup';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_contact_channel TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_contact_url TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_country TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_governorate TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_notes TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);
    const result = await pool.query(
      `SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders/user/:userId", authenticate, async (req, res) => {
  try {
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;");
    const { userId } = req.params;
    if (userId !== req.user.id && !hasPermission(req.user, "orders.manage")) return res.status(403).json({ error: "Not allowed" });
    const result = await pool.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders", authenticate, async (req, res) => {
  try {
    await pool.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_jod NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_usd NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_jod NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_usd NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost_jod NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost_usd NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_jod NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_usd NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash_pickup';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_payment';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT '';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT DEFAULT '';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT DEFAULT '';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_type TEXT DEFAULT 'pickup';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_contact_channel TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_contact_url TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_country TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_governorate TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_notes TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_contact_channel TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_contact_url TEXT;
    `);
    const {
      user_id,
      order_number,
      items,
      subtotal_jod,
      subtotal_usd,
      discount_jod,
      discount_usd,
      shipping_cost_jod,
      shipping_cost_usd,
      total_jod,
      total_usd,
      payment_method,
      status,
      customer_name,
      customer_phone,
      customer_email,
      shipping_address,
      shipping_notes,
      fulfillment_type,
      shipping_country,
      shipping_city,
      shipping_governorate,
      delivery_contact_channel,
      delivery_contact_url,
    } = req.body;
    if (user_id !== req.user.id) return res.status(403).json({ error: "Orders can only be created for the signed-in user" });

    const result = await pool.query(
      `INSERT INTO orders (user_id, order_number, items, subtotal_jod, subtotal_usd,
                           discount_jod, discount_usd, shipping_cost_jod, shipping_cost_usd,
                           total_jod, total_usd, payment_method, status, customer_name,
                           customer_phone, customer_email, shipping_address, shipping_notes,
                           fulfillment_type, shipping_country, shipping_city, shipping_governorate,
                           delivery_contact_channel, delivery_contact_url)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
       RETURNING *`,
      [
        user_id,
        order_number,
        JSON.stringify(items),
        subtotal_jod,
        subtotal_usd,
        discount_jod,
        discount_usd,
        shipping_cost_jod,
        shipping_cost_usd,
        total_jod,
        total_usd,
        payment_method,
        status || "pending_payment",
        customer_name,
        customer_phone,
        customer_email,
        shipping_address,
        shipping_notes,
        fulfillment_type || "pickup",
        shipping_country || "",
        shipping_city || "",
        shipping_governorate || "",
        delivery_contact_channel || "",
        delivery_contact_url || "",
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/orders/:id/status", ...protectWrite("orders.manage"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== REVIEWS ====================
app.get("/api/reviews", async (req, res) => {
  try {
    const result = await pool.query("SELECT r.*, u.name AS user_name, u.avatar AS user_avatar FROM reviews r LEFT JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC");
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Unable to load reviews" }); }
});

app.get("/api/reviews/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(
      `SELECT r.*, u.name as user_name, u.avatar as user_avatar
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/reviews", authenticate, async (req, res) => {
  try {
    const { product_id, user_id, rating, comment } = req.body;
    if (user_id !== req.user.id) return res.status(403).json({ error: "Reviews can only be created for the signed-in user" });

    const result = await pool.query(
      `INSERT INTO reviews (product_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [product_id, user_id, rating, comment],
    );

    const avgResult = await pool.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count
       FROM reviews WHERE product_id = $1`,
      [product_id],
    );

    const avgRating = parseFloat(avgResult.rows[0].avg_rating) || 5;
    const count = parseInt(avgResult.rows[0].count) || 0;

    await pool.query(
      "UPDATE products SET rating = $1, reviews_count = $2 WHERE id = $3",
      [avgRating, count, product_id],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/reviews/:id", ...protectWrite("content.manage"), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM reviews WHERE id = $1", [id]);
    res.json({ success: true, message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CART ====================
app.get("/api/cart/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.id) return res.status(403).json({ error: "Not allowed" });
    const result = await pool.query("SELECT * FROM carts WHERE user_id = $1", [
      userId,
    ]);
    res.json(result.rows[0] || { user_id: userId, items: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cart/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.id) return res.status(403).json({ error: "Not allowed" });
    const { items } = req.body;

    const result = await pool.query(
      `INSERT INTO carts (user_id, items)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET items = EXCLUDED.items, updated_at = NOW()
       RETURNING *`,
      [userId, JSON.stringify(items)],
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== WISHLIST ====================
app.get("/api/wishlist/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.id) return res.status(403).json({ error: "Not allowed" });
    const result = await pool.query(
      "SELECT * FROM wishlists WHERE user_id = $1",
      [userId],
    );
    res.json(result.rows[0] || { user_id: userId, product_ids: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/wishlist/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.id) return res.status(403).json({ error: "Not allowed" });
    const { product_ids } = req.body;

    const result = await pool.query(
      `INSERT INTO wishlists (user_id, product_ids)
       VALUES ($1, $2::text[])
       ON CONFLICT (user_id) DO UPDATE SET product_ids = EXCLUDED.product_ids
       RETURNING *`,
      [userId, product_ids],
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SUPPLIERS ====================
const ensureSupplierSchema = () => pool.query(`
  ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone TEXT;
  ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_type TEXT NOT NULL DEFAULT 'general';
  ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  CREATE TABLE IF NOT EXISTS product_suppliers (
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, supplier_id)
  );
`);

app.get("/api/suppliers", ...protectWrite("suppliers.manage"), async (req, res) => {
  try {
    await ensureSupplierSchema();
    const { q = "", status = "" } = req.query;
    const result = await pool.query(
      `SELECT s.*, COALESCE(array_agg(ps.product_id) FILTER (WHERE ps.product_id IS NOT NULL), '{}') AS product_ids
       FROM suppliers s LEFT JOIN product_suppliers ps ON ps.supplier_id = s.id
       WHERE ($1 = '' OR s.name ILIKE '%' || $1 || '%' OR s.email ILIKE '%' || $1 || '%' OR s.phone ILIKE '%' || $1 || '%')
         AND ($2 = '' OR s.status = $2)
       GROUP BY s.id ORDER BY s.created_at DESC`,
      [q, status],
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Unable to load suppliers" });
  }
});

app.post("/api/suppliers", ...protectWrite("suppliers.manage"), async (req, res) => {
  try {
    await ensureSupplierSchema();
    const { name, phone = "", email = "", supplier_type = "general", status = "active", notes = "", product_ids = [] } = req.body;
    if (!String(name || "").trim()) return res.status(400).json({ error: "Supplier name is required" });
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: "Invalid supplier status" });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Invalid supplier email" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO suppliers (name, phone, email, supplier_type, status, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [name.trim(), phone.trim(), email.trim(), supplier_type.trim(), status, notes.trim()],
      );
      for (const productId of Array.isArray(product_ids) ? product_ids : []) {
        await client.query("INSERT INTO product_suppliers (product_id, supplier_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [productId, result.rows[0].id]);
      }
      await client.query("COMMIT");
      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  } catch (error) {
    res.status(500).json({ error: "Unable to create supplier" });
  }
});

app.put("/api/suppliers/:id", ...protectWrite("suppliers.manage"), async (req, res) => {
  try {
    await ensureSupplierSchema();
    const { name, phone = "", email = "", supplier_type = "general", status = "active", notes = "", product_ids = [] } = req.body;
    if (!String(name || "").trim()) return res.status(400).json({ error: "Supplier name is required" });
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: "Invalid supplier status" });
    const result = await pool.query(
      `UPDATE suppliers SET name=$1, phone=$2, email=$3, supplier_type=$4, status=$5, notes=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [name.trim(), phone.trim(), email.trim(), supplier_type.trim(), status, notes.trim(), req.params.id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Supplier not found" });
    await pool.query("DELETE FROM product_suppliers WHERE supplier_id = $1", [req.params.id]);
    for (const productId of Array.isArray(product_ids) ? product_ids : []) {
      await pool.query("INSERT INTO product_suppliers (product_id, supplier_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [productId, req.params.id]);
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Unable to update supplier" });
  }
});

app.delete("/api/suppliers/:id", ...protectWrite("suppliers.manage"), async (req, res) => {
  try {
    await ensureSupplierSchema();
    const result = await pool.query("UPDATE suppliers SET status='inactive', updated_at=NOW() WHERE id=$1 RETURNING id", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Supplier not found" });
    res.json({ success: true, status: "inactive" });
  } catch (error) {
    res.status(500).json({ error: "Unable to disable supplier" });
  }
});

// ==================== SUPPORT ====================
const ticketWithMessages = async (ticketId) => {
  const result = await pool.query(
    `SELECT t.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
       COALESCE(json_agg(json_build_object('id',m.id,'senderId',m.sender_id,'senderName',su.name,'senderRole',m.sender_role,'text',m.message,'createdAt',m.created_at) ORDER BY m.created_at) FILTER (WHERE m.id IS NOT NULL), '[]') AS messages
     FROM support_tickets t JOIN users u ON u.id=t.user_id
     LEFT JOIN support_messages m ON m.ticket_id=t.id LEFT JOIN users su ON su.id=m.sender_id
     WHERE t.id=$1 GROUP BY t.id,u.name,u.email,u.phone`, [ticketId]);
  return result.rows[0];
};

app.get("/api/support/tickets", authenticate, async (req, res) => {
  try {
    const isStaff = hasPermission(req.user, "support.manage");
    const result = await pool.query(
      `SELECT t.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
       COALESCE(json_agg(json_build_object('id',m.id,'senderId',m.sender_id,'senderName',su.name,'senderRole',m.sender_role,'text',m.message,'createdAt',m.created_at) ORDER BY m.created_at) FILTER (WHERE m.id IS NOT NULL), '[]') AS messages
       FROM support_tickets t JOIN users u ON u.id=t.user_id
       LEFT JOIN support_messages m ON m.ticket_id=t.id LEFT JOIN users su ON su.id=m.sender_id
       WHERE ($1 OR t.user_id=$2) GROUP BY t.id,u.name,u.email,u.phone ORDER BY t.updated_at DESC`, [isStaff, req.user.id]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Unable to load support tickets" }); }
});

app.post("/api/support/tickets", authenticate, async (req, res) => {
  try {
    const { subject, message, category = "general", orderNumber } = req.body;
    if (!String(subject || "").trim() || !String(message || "").trim()) return res.status(400).json({ error: "Subject and message are required" });
    const ticketId = crypto.randomUUID();
    await pool.query("INSERT INTO support_tickets (id,user_id,subject,category,order_number) VALUES ($1,$2,$3,$4,$5)", [ticketId, req.user.id, subject.trim(), category, orderNumber || null]);
    await pool.query("INSERT INTO support_messages (id,ticket_id,sender_id,sender_role,message) VALUES ($1,$2,$3,$4,$5)", [crypto.randomUUID(), ticketId, req.user.id, req.user.role, message.trim()]);
    res.status(201).json(await ticketWithMessages(ticketId));
  } catch (error) { res.status(500).json({ error: "Unable to create support ticket" }); }
});

app.post("/api/support/tickets/:id/messages", authenticate, async (req, res) => {
  try {
    const ticket = await ticketWithMessages(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.user_id !== req.user.id && !hasPermission(req.user, "support.manage")) return res.status(403).json({ error: "Not allowed" });
    if (!String(req.body.message || "").trim()) return res.status(400).json({ error: "Message is required" });
    await pool.query("INSERT INTO support_messages (id,ticket_id,sender_id,sender_role,message) VALUES ($1,$2,$3,$4,$5)", [crypto.randomUUID(), req.params.id, req.user.id, req.user.role, req.body.message.trim()]);
    await pool.query("UPDATE support_tickets SET status='in_progress', updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.json(await ticketWithMessages(req.params.id));
  } catch (error) { res.status(500).json({ error: "Unable to save support message" }); }
});

app.patch("/api/support/tickets/:id/status", ...protectWrite("support.manage"), async (req, res) => {
  if (!["open", "in_progress", "resolved", "closed"].includes(req.body.status)) return res.status(400).json({ error: "Invalid ticket status" });
  const result = await pool.query("UPDATE support_tickets SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING id", [req.body.status, req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: "Ticket not found" });
  res.json(await ticketWithMessages(req.params.id));
});

app.post("/api/support/tickets/:id/ai-reply", ...protectWrite("support.manage"), async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "AI support is not configured" });
  try {
    const ticket = await ticketWithMessages(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    const response = await fetch(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.2, messages: [
        { role: "system", content: "You are Qwader Store support. Reply in the customer's language. Never request or expose passwords, API keys, payment secrets, or private credentials. If unsure, say a human agent will follow up." },
        { role: "user", content: JSON.stringify({ subject: ticket.subject, category: ticket.category, messages: ticket.messages }) },
      ] }),
    });
    if (!response.ok) return res.status(502).json({ error: "AI provider is temporarily unavailable" });
    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content?.trim();
    if (!message) return res.status(502).json({ error: "AI provider returned an empty response" });
    const aiUserId = process.env.AI_SUPPORT_USER_ID || req.user.id;
    await pool.query("INSERT INTO support_messages (id,ticket_id,sender_id,sender_role,message,metadata) VALUES ($1,$2,$3,'staff',$4,$5)", [crypto.randomUUID(), req.params.id, aiUserId, message, JSON.stringify({ provider: "openai-compatible", generated: true })]);
    await pool.query("UPDATE support_tickets SET status='in_progress', updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.json(await ticketWithMessages(req.params.id));
  } catch (error) { res.status(502).json({ error: "AI support is temporarily unavailable" }); }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(
    `📊 Database: ${process.env.DATABASE_URL || process.env.POSTGRES_URL ? "✅ Configured" : "❌ Missing DATABASE_URL/POSTGRES_URL"}`,
  );
});
