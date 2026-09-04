const PERMISSIONS = [
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

const OWNER_PERMISSIONS = new Set(PERMISSIONS);

function normalizePermissions(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((permission) => PERMISSIONS.includes(permission)))];
}

function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === "owner" || user.role === "admin") return true;
  return normalizePermissions(user.permissions).includes(permission);
}

module.exports = { PERMISSIONS, OWNER_PERMISSIONS, normalizePermissions, hasPermission };