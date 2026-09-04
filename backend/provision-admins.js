const { Pool } = require("pg");
const crypto = require("crypto");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

const allPermissions = [
  "products.manage",
  "orders.manage",
  "customers.manage",
  "support.manage",
  "suppliers.manage",
  "promotions.manage",
  "settings.manage",
  "reports.view",
  "staff.manage",
  "content.manage",
];

async function provisionUser({ email, name, role, permissions }) {
  if (!email) return;
  const result = await pool.query(
    `INSERT INTO users (id, name, email, role, permissions, registered_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       permissions = EXCLUDED.permissions,
       updated_at = NOW()
     RETURNING id, email, role`,
    [crypto.randomUUID(), name, email.trim().toLowerCase(), role, JSON.stringify(permissions)],
  );
  console.log(`${role} provisioned: ${result.rows[0].email}`);
}

(async () => {
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb");
  await provisionUser({
    email: process.env.OWNER_EMAIL,
    name: process.env.OWNER_NAME || "Qwader Store Owner",
    role: "owner",
    permissions: allPermissions,
  });
  await provisionUser({
    email: process.env.STAFF_EMAIL,
    name: process.env.STAFF_NAME || "Qwader Store Staff",
    role: "staff",
    permissions: (process.env.STAFF_PERMISSIONS || "products.manage,orders.manage,support.manage").split(",").filter((permission) => allPermissions.includes(permission)),
  });
})()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
