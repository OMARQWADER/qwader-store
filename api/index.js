const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const otpRequests = new Map();
const escapeHtml = (value) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#039;");

app.post("/api/otp", async (req, res) => {
  try {
    const { toEmail, code, purpose } = req.body || {};
    const recipient = String(toEmail || "").trim().toLowerCase();
    const cleanCode = String(code || "").trim();
    const cleanPurpose = String(purpose || "QWADER STORE").trim().slice(0, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || !/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ error: "A valid email and 6-digit code are required" });
    }
    const now = Date.now();
    const requestTimes = (otpRequests.get(recipient) || []).filter((time) => now - time < 10 * 60 * 1000);
    if (requestTimes.length >= 5) {
      return res.status(429).json({ error: "Too many verification requests" });
    }
    requestTimes.push(now);
    otpRequests.set(recipient, requestTimes);
    if (!process.env.RESEND_API_KEY) {
      return res.status(503).json({ error: "Email provider is not configured" });
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "قويدر ستور | QWADER STORE <support@qwader.jo>",
        to: [recipient],
        subject: `رمز التحقق - ${cleanPurpose}`,
        html: `<p>${escapeHtml(cleanPurpose)}</p><p>Your verification code is <strong>${escapeHtml(cleanCode)}</strong>.</p>`,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ error: result?.message || "Email provider rejected the message" });
    }
    res.json({ success: true, id: result?.id });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Email provider unavailable" });
  }
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

const JWT_SECRET =
  process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? null : "qwader-local-dev");

const ADMIN_ROLES = new Set(["owner", "admin"]);
const STAFF_ROLES = new Set(["owner", "admin", "staff", "employee"]);
const ALLOWED_ROLES = new Set(["owner", "staff", "customer", "admin", "employee"]);
const PERMISSIONS = new Set(["products.manage", "orders.manage", "customers.manage", "support.manage", "suppliers.manage", "promotions.manage", "settings.manage", "reports.view", "staff.manage", "content.manage"]);
const REMOTE_CHANNELS_BLOCKED = new Set(["tiktok", "youtube"]);

function normalizeRole(role) {
  const value = String(role || "customer").toLowerCase();
  if (value === "admin" || value === "owner") return "owner";
  if (value === "employee" || value === "staff") return "staff";
  return "customer";
}

function signUserToken(user) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(
    { sub: user.id, role: normalizeRole(user.role), permissions: Array.isArray(user.permissions) ? user.permissions : [], email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function readAuthUser(req) {
  if (!JWT_SECRET) return null;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireStaff(req, res, next) {
  const auth = readAuthUser(req);
  if (!auth || !STAFF_ROLES.has(normalizeRole(auth.role))) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.auth = auth;
  next();
}

function requireAdmin(req, res, next) {
  const auth = readAuthUser(req);
  if (!auth || !ADMIN_ROLES.has(normalizeRole(auth.role))) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.auth = auth;
  next();
}

function requirePermission(permission) {
  return async (req, res, next) => {
    const auth = readAuthUser(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    if (normalizeRole(auth.role) === "owner" || (Array.isArray(auth.permissions) && auth.permissions.includes(permission))) {
      req.auth = auth;
      return next();
    }
    return res.status(403).json({ error: "Forbidden" });
  };
}

app.get("/api/auth/me", (req, res) => {
  const auth = readAuthUser(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  res.json({ user: auth });
});

let storeTablesReady;
let supportTablesReady;
let productColumnsReady;
let orderColumnsReady;
let supplierTablesReady;

function ensureSupplierTables() {
  if (!supplierTablesReady) {
    supplierTablesReady = pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;
      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL, phone TEXT, email TEXT, supplier_type TEXT NOT NULL DEFAULT 'general',
        status TEXT NOT NULL DEFAULT 'active', notes TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_type TEXT NOT NULL DEFAULT 'general';
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      CREATE TABLE IF NOT EXISTS product_suppliers (
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, supplier_id)
      );
    `).catch((error) => { supplierTablesReady = null; throw error; });
  }
  return supplierTablesReady;
}

function ensureStoreTables() {
  if (!storeTablesReady) {
    storeTablesReady = pool.query(`
    CREATE TABLE IF NOT EXISTS store_config (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP DEFAULT NOW()
    );
    INSERT INTO store_config (id, data)
    VALUES ('default', '{}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
    `).catch((error) => {
      storeTablesReady = null;
      throw error;
    });
  }
  return storeTablesReady;
}

function ensureSupportTables() {
  if (!supportTablesReady) {
    supportTablesReady = pool.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      order_number TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS support_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_role TEXT NOT NULL DEFAULT 'customer',
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      is_read BOOLEAN DEFAULT false
    );
    CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
    CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
    `).catch((error) => {
      supportTablesReady = null;
      throw error;
    });
  }
  return supportTablesReady;
}

function ensureProductColumns() {
  if (!productColumnsReady) {
    productColumnsReady = pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price_jod NUMERIC(10,2);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price_usd NUMERIC(10,2);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS badge_ar TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS badge_en TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'PS4 & PS5';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS region_ar TEXT DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS region_en TEXT DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_type_ar TEXT DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_type_en TEXT DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS short_desc_ar TEXT DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS short_desc_en TEXT DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS features_ar JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS features_en JSONB DEFAULT '[]'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);
    `).catch((error) => {
      productColumnsReady = null;
      throw error;
    });
  }
  return productColumnsReady;
}

function ensureOrderColumns() {
  if (!orderColumnsReady) {
    orderColumnsReady = pool.query(`
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
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
    `).catch((error) => {
      orderColumnsReady = null;
      throw error;
    });
  }
  return orderColumnsReady;
}


// ==================== HEALTH CHECK ====================
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "✅ Database connected", time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({
      error: err.message || err.code || "Database unavailable",
    });
  }
});

// ==================== USERS ====================
app.get("/api/users", requireStaff, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, role, avatar, permissions, NOW() AS registered_at FROM users ORDER BY id DESC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const auth = readAuthUser(req);
    if (!auth || (auth.sub !== id && !STAFF_ROLES.has(normalizeRole(auth.role)))) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await pool.query(
      "SELECT id, name, email, phone, role, avatar, permissions, NOW() AS registered_at FROM users WHERE id = $1",
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
    await ensureSupplierTables();
    const { id, name, email, phone, role, avatar } = req.body;
    const auth = readAuthUser(req);
    const requestedRole = String(role || "customer").toLowerCase();
    const safeRole =
      auth && STAFF_ROLES.has(normalizeRole(auth.role))
        ? requestedRole
        : "customer";

    const result = await pool.query(
      `INSERT INTO users (id, name, email, phone, role, avatar, permissions)
       VALUES ($1, $2, $3, $4, $5, $6, '[]'::jsonb)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         phone = EXCLUDED.phone,
         avatar = EXCLUDED.avatar
      RETURNING id, name, email, phone, role, avatar, permissions, NOW() AS registered_at`,
      [id, name, email, phone || "", safeRole, avatar],
    );

    const user = result.rows[0];
    res.json({ success: true, user, token: signUserToken(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const auth = readAuthUser(req);
    if (!auth || (auth.sub !== id && !STAFF_ROLES.has(normalizeRole(auth.role)))) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { name, phone, promotional_emails } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           promotional_emails = COALESCE($3, promotional_emails)
       WHERE id = $4
      RETURNING id, name, email, phone, role, avatar, permissions, promotional_emails, NOW() AS registered_at`,
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

app.put("/api/users/:id/role", requirePermission("staff.manage"), async (req, res) => {
  try {
    await ensureSupplierTables();
    const { id } = req.params;
    const requestedRole = String(req.body?.role || "").toLowerCase();
    if (!ALLOWED_ROLES.has(requestedRole)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const storedRole = normalizeRole(requestedRole);
    const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions.filter((permission) => PERMISSIONS.has(permission)) : [];
    if (storedRole === "owner" && normalizeRole(req.auth.role) !== "owner") return res.status(403).json({ error: "Only the owner can assign owner access" });
    const result = await pool.query(
      `UPDATE users SET role = $1, permissions = $2::jsonb WHERE id = $3
       RETURNING id, name, email, phone, role, avatar, permissions, NOW() AS registered_at`,
      [storedRole, JSON.stringify(permissions), id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id", requireAdmin, async (req, res) => {
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
    await ensureProductColumns();
    const result = await pool.query(
      "SELECT * FROM products ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    await ensureProductColumns();
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

app.post("/api/products", requirePermission("products.manage"), async (req, res) => {
  try {
    await ensureProductColumns();
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
      original_price_jod, original_price_usd, low_stock_threshold, is_featured,
      badge_ar, badge_en, platform, region_ar, region_en,
      delivery_type_ar, delivery_type_en, short_desc_ar, short_desc_en,
      features_ar, features_en,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO products (name_ar, name_en, description_ar, description_en,
                 price_jod, price_usd, category, image, images, stock_quantity,
                 original_price_jod, original_price_usd, low_stock_threshold, is_featured,
                 badge_ar, badge_en, platform, region_ar, region_en,
                 delivery_type_ar, delivery_type_en, short_desc_ar, short_desc_en,
                 features_ar, features_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24::jsonb, $25::jsonb)
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
        original_price_jod, original_price_usd, low_stock_threshold || 5, Boolean(is_featured),
        badge_ar || null, badge_en || null, platform || "PS4 & PS5", region_ar || "", region_en || "",
        delivery_type_ar || "", delivery_type_en || "", short_desc_ar || "", short_desc_en || "",
        JSON.stringify(Array.isArray(features_ar) ? features_ar : []),
        JSON.stringify(Array.isArray(features_en) ? features_en : []),
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", requirePermission("products.manage"), async (req, res) => {
  try {
    await ensureProductColumns();
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
      original_price_jod, original_price_usd, low_stock_threshold, is_featured,
      badge_ar, badge_en, platform, region_ar, region_en,
      delivery_type_ar, delivery_type_en, short_desc_ar, short_desc_en,
      features_ar, features_en,
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
             stock_quantity = COALESCE($10, stock_quantity),
             original_price_jod = COALESCE($11, original_price_jod),
             original_price_usd = COALESCE($12, original_price_usd),
             low_stock_threshold = COALESCE($13, low_stock_threshold),
             is_featured = COALESCE($14, is_featured),
             badge_ar = COALESCE($15, badge_ar), badge_en = COALESCE($16, badge_en),
             platform = COALESCE($17, platform), region_ar = COALESCE($18, region_ar), region_en = COALESCE($19, region_en),
             delivery_type_ar = COALESCE($20, delivery_type_ar), delivery_type_en = COALESCE($21, delivery_type_en),
             short_desc_ar = COALESCE($22, short_desc_ar), short_desc_en = COALESCE($23, short_desc_en),
             features_ar = COALESCE($24::jsonb, features_ar), features_en = COALESCE($25::jsonb, features_en)
           WHERE id = $26
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
        original_price_jod, original_price_usd, low_stock_threshold, is_featured,
        badge_ar, badge_en, platform, region_ar, region_en,
        delivery_type_ar, delivery_type_en, short_desc_ar, short_desc_en,
        features_ar ? JSON.stringify(features_ar) : null,
        features_en ? JSON.stringify(features_en) : null,
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

app.delete("/api/products/:id", requirePermission("products.manage"), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM products WHERE id = $1", [id]);
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/products/:id/stock", requirePermission("products.manage"), async (req, res) => {
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
app.get("/api/orders", requirePermission("orders.manage"), async (req, res) => {
  try {
    await ensureOrderColumns();
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

app.get("/api/orders/user/:userId", async (req, res) => {
  try {
    await ensureOrderColumns();
    const { userId } = req.params;
    const auth = readAuthUser(req);
    if (!auth || (auth.sub !== userId && !STAFF_ROLES.has(normalizeRole(auth.role)))) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await pool.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    await ensureOrderColumns();
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

    const auth = readAuthUser(req);
    const isGuestOrder = String(user_id || "").startsWith("guest-");
    if (
      !isGuestOrder &&
      (!auth || (auth.sub !== user_id && !STAFF_ROLES.has(normalizeRole(auth.role))))
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (
      payment_method === "cash_pickup" &&
      (fulfillment_type === "delivery" || delivery_contact_channel)
    ) {
      return res.status(400).json({
        error: "Cash on delivery is unavailable for digital or remote orders",
      });
    }

    if (REMOTE_CHANNELS_BLOCKED.has(String(delivery_contact_channel || "").toLowerCase())) {
      return res.status(400).json({ error: "This delivery channel is unavailable" });
    }

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

app.patch("/api/orders/:id/status", requirePermission("orders.manage"), async (req, res) => {
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
    const result = await pool.query(
      `SELECT r.*, u.name as user_name, u.avatar as user_avatar
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

app.post("/api/reviews", async (req, res) => {
  try {
    const { product_id, user_id, rating, comment } = req.body;
    const auth = readAuthUser(req);
    if (!auth || auth.sub !== user_id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

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

app.delete("/api/reviews/:id", requirePermission("content.manage"), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM reviews WHERE id = $1", [id]);
    res.json({ success: true, message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SUPPORT ====================
app.get("/api/support/tickets", async (req, res) => {
  try {
    const auth = readAuthUser(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    await ensureSupportTables();
    const canManage = normalizeRole(auth.role) === "owner" || (Array.isArray(auth.permissions) && auth.permissions.includes("support.manage"));
    const ticketResult = await pool.query(
      `SELECT t.id, t.user_id AS "userId", u.name AS "userName", u.email AS "userEmail",
              u.phone AS "userPhone", t.subject, t.category, t.order_number AS "orderNumber",
              t.status, t.created_at AS "createdAt", t.updated_at AS "updatedAt"
       FROM support_tickets t
       JOIN users u ON u.id = t.user_id
       ${canManage ? "" : "WHERE t.user_id = $1"}
       ORDER BY t.updated_at DESC`,
      canManage ? [] : [auth.sub],
    );
    const tickets = ticketResult.rows;
    if (tickets.length === 0) return res.json([]);
    const messageResult = await pool.query(
      `SELECT m.id, m.ticket_id AS "ticketId", m.sender_id AS "senderId",
              u.name AS "senderName", m.sender_role AS "senderRole", m.message,
              m.created_at AS "timestamp", m.is_read AS "isRead"
       FROM support_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.ticket_id = ANY($1::text[])
       ORDER BY m.created_at ASC`,
      [tickets.map((ticket) => ticket.id)],
    );
    const messagesByTicket = new Map();
    for (const message of messageResult.rows) {
      const current = messagesByTicket.get(message.ticketId) || [];
      current.push({ ...message, text: message.message, createdAt: message.timestamp });
      messagesByTicket.set(message.ticketId, current);
    }
    res.json(tickets.map((ticket) => ({
      ...ticket,
      lastActivity: ticket.updatedAt,
      messages: messagesByTicket.get(ticket.id) || [],
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/support/tickets", async (req, res) => {
  let client;
  try {
    const auth = readAuthUser(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    await ensureSupportTables();
    const { subject, message, category = "general", orderNumber } = req.body || {};
    if (!String(subject || "").trim() || !String(message || "").trim()) {
      return res.status(400).json({ error: "Subject and message are required" });
    }
    const ticketId = `tkt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO support_tickets (id, user_id, subject, category, order_number)
       VALUES ($1, $2, $3, $4, $5)`,
      [ticketId, auth.sub, String(subject).trim(), category, orderNumber || null],
    );
    await client.query(
      `INSERT INTO support_messages (id, ticket_id, sender_id, sender_role, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [messageId, ticketId, auth.sub, normalizeRole(auth.role), String(message).trim()],
    );
    await client.query("COMMIT");
    res.status(201).json({ id: ticketId });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    res.status(500).json({ error: err.message });
  } finally {
    client?.release();
  }
});

app.post("/api/support/tickets/:ticketId/messages", async (req, res) => {
  try {
    const auth = readAuthUser(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    await ensureSupportTables();
    const { ticketId } = req.params;
    const { message } = req.body || {};
    if (!String(message || "").trim()) return res.status(400).json({ error: "Message is required" });
    const ticketResult = await pool.query("SELECT user_id, status FROM support_tickets WHERE id = $1", [ticketId]);
    const ticket = ticketResult.rows[0];
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    const canManage = normalizeRole(auth.role) === "owner" || (Array.isArray(auth.permissions) && auth.permissions.includes("support.manage"));
    if (!canManage && ticket.user_id !== auth.sub) return res.status(403).json({ error: "Forbidden" });
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      `INSERT INTO support_messages (id, ticket_id, sender_id, sender_role, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [messageId, ticketId, auth.sub, normalizeRole(auth.role), String(message).trim()],
    );
    await pool.query("UPDATE support_tickets SET updated_at = NOW() WHERE id = $1", [ticketId]);
    res.status(201).json({ id: messageId, ticketId, message: String(message).trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/support/tickets/:ticketId/status", requirePermission("support.manage"), async (req, res) => {
  try {
    await ensureSupportTables();
    const { ticketId } = req.params;
    const { status } = req.body || {};
    if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
      return res.status(400).json({ error: "Invalid ticket status" });
    }
    const result = await pool.query(
      `UPDATE support_tickets SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING status, updated_at AS "updatedAt"`,
      [status, ticketId],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Ticket not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CART ====================
app.get("/api/cart/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const auth = readAuthUser(req);
    if (!auth || (auth.sub !== userId && !STAFF_ROLES.has(normalizeRole(auth.role)))) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await pool.query("SELECT * FROM carts WHERE user_id = $1", [
      userId,
    ]);
    res.json(result.rows[0] || { user_id: userId, items: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cart/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const auth = readAuthUser(req);
    if (!auth || (auth.sub !== userId && !STAFF_ROLES.has(normalizeRole(auth.role)))) {
      return res.status(401).json({ error: "Unauthorized" });
    }
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
app.get("/api/wishlist/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const auth = readAuthUser(req);
    if (!auth || (auth.sub !== userId && !STAFF_ROLES.has(normalizeRole(auth.role)))) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await pool.query(
      "SELECT * FROM wishlists WHERE user_id = $1",
      [userId],
    );
    res.json(result.rows[0] || { user_id: userId, product_ids: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/wishlist/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const auth = readAuthUser(req);
    if (!auth || (auth.sub !== userId && !STAFF_ROLES.has(normalizeRole(auth.role)))) {
      return res.status(401).json({ error: "Unauthorized" });
    }
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
app.get("/api/suppliers", requirePermission("suppliers.manage"), async (req, res) => {
  try {
    await ensureSupplierTables();
    const { q = "", status = "" } = req.query;
    const result = await pool.query(
      `SELECT s.*, COALESCE(array_agg(ps.product_id) FILTER (WHERE ps.product_id IS NOT NULL), '{}') AS product_ids
       FROM suppliers s LEFT JOIN product_suppliers ps ON ps.supplier_id=s.id
       WHERE ($1='' OR s.name ILIKE '%' || $1 || '%' OR s.email ILIKE '%' || $1 || '%' OR s.phone ILIKE '%' || $1 || '%')
         AND ($2='' OR s.status=$2) GROUP BY s.id ORDER BY s.created_at DESC`, [q, status]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Unable to load suppliers" }); }
});

app.post("/api/suppliers", requirePermission("suppliers.manage"), async (req, res) => {
  try {
    await ensureSupplierTables();
    const { name, phone = "", email = "", supplier_type = "general", status = "active", notes = "", product_ids = [] } = req.body || {};
    if (!String(name || "").trim()) return res.status(400).json({ error: "Supplier name is required" });
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: "Invalid supplier status" });
    const result = await pool.query("INSERT INTO suppliers (name,phone,email,supplier_type,status,notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *", [String(name).trim(), String(phone).trim(), String(email).trim(), String(supplier_type).trim(), status, String(notes).trim()]);
    for (const productId of Array.isArray(product_ids) ? product_ids : []) await pool.query("INSERT INTO product_suppliers (product_id,supplier_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [productId, result.rows[0].id]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: "Unable to create supplier" }); }
});

app.put("/api/suppliers/:id", requirePermission("suppliers.manage"), async (req, res) => {
  try {
    await ensureSupplierTables();
    const { name, phone = "", email = "", supplier_type = "general", status = "active", notes = "", product_ids = [] } = req.body || {};
    if (!String(name || "").trim()) return res.status(400).json({ error: "Supplier name is required" });
    const result = await pool.query("UPDATE suppliers SET name=$1,phone=$2,email=$3,supplier_type=$4,status=$5,notes=$6,updated_at=NOW() WHERE id=$7 RETURNING *", [String(name).trim(), String(phone).trim(), String(email).trim(), String(supplier_type).trim(), status, String(notes).trim(), req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Supplier not found" });
    await pool.query("DELETE FROM product_suppliers WHERE supplier_id=$1", [req.params.id]);
    for (const productId of Array.isArray(product_ids) ? product_ids : []) await pool.query("INSERT INTO product_suppliers (product_id,supplier_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [productId, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: "Unable to update supplier" }); }
});

app.delete("/api/suppliers/:id", requirePermission("suppliers.manage"), async (req, res) => {
  try {
    await ensureSupplierTables();
    const result = await pool.query("UPDATE suppliers SET status='inactive',updated_at=NOW() WHERE id=$1 RETURNING id", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Supplier not found" });
    res.json({ success: true, status: "inactive" });
  } catch (err) { res.status(500).json({ error: "Unable to disable supplier" }); }
});

app.post("/api/support/tickets/:ticketId/ai-reply", requirePermission("support.manage"), async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "AI support is not configured" });
  try {
    await ensureSupportTables();
    const ticketResult = await pool.query("SELECT subject, category FROM support_tickets WHERE id=$1", [req.params.ticketId]);
    if (!ticketResult.rows[0]) return res.status(404).json({ error: "Ticket not found" });
    const messages = await pool.query("SELECT sender_role, message FROM support_messages WHERE ticket_id=$1 ORDER BY created_at", [req.params.ticketId]);
    const response = await fetch(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.2, messages: [{ role: "system", content: "You are Qwader Store support. Reply in the customer's language. Never request or expose passwords, API keys, payment secrets, or private credentials." }, { role: "user", content: JSON.stringify({ ticket: ticketResult.rows[0], messages: messages.rows }) }] }) });
    if (!response.ok) return res.status(502).json({ error: "AI provider is temporarily unavailable" });
    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content?.trim();
    if (!message) return res.status(502).json({ error: "AI provider returned an empty response" });
    await pool.query("INSERT INTO support_messages (id,ticket_id,sender_id,sender_role,message) VALUES ($1,$2,$3,'staff',$4)", [crypto.randomUUID(), req.params.ticketId, req.auth.sub, message]);
    await pool.query("UPDATE support_tickets SET status='in_progress',updated_at=NOW() WHERE id=$1", [req.params.ticketId]);
    res.json({ success: true, message });
  } catch (err) { res.status(502).json({ error: "AI support is temporarily unavailable" }); }
});

app.get("/api/store-config", async (req, res) => {
  try {
    await ensureStoreTables();
    const result = await pool.query(
      "SELECT data FROM store_config WHERE id = 'default'",
    );
    res.json(result.rows[0]?.data || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/store-config", requireStaff, async (req, res) => {
  try {
    await ensureStoreTables();
    const incoming = req.body && typeof req.body === "object" ? req.body : {};
    const existing = await pool.query(
      "SELECT data FROM store_config WHERE id = 'default'",
    );
    const current = existing.rows[0]?.data || {};
    const next = {
      ...current,
      ...incoming,
      settings: {
        ...(current.settings || {}),
        ...(incoming.settings || {}),
      },
      promoCodes: Array.isArray(incoming.promoCodes)
        ? incoming.promoCodes
        : current.promoCodes || [],
    };
    const saved = await pool.query(
      `INSERT INTO store_config (id, data, updated_at)
       VALUES ('default', $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
       RETURNING data`,
      [JSON.stringify(next)],
    );
    res.json(saved.rows[0].data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== START SERVER ====================
// For Vercel serverless deployment
module.exports = app;
