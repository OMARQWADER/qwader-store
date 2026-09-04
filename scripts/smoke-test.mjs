const baseUrl = process.argv[2] || process.env.SMOKE_BASE_URL || "http://localhost:5000";

const checks = [
  ["health", "/api/health", 200],
  ["products catalog", "/api/products", 200],
  ["store config", "/api/store-config", 200],
  ["users protected", "/api/users", 401],
  ["orders protected", "/api/orders", 401],
  ["suppliers protected", "/api/suppliers", 401],
  ["support protected", "/api/support/tickets", 401],
  ["cart protected", "/api/cart/test-user", 401],
  ["wishlist protected", "/api/wishlist/test-user", 401],
  ["product create protected", "/api/products", 401, "POST"],
  ["product update protected", "/api/products/test-product", 401, "PUT"],
  ["order status protected", "/api/orders/test-order/status", 401, "PATCH"],
  ["supplier create protected", "/api/suppliers", 401, "POST"],
  ["support AI protected", "/api/support/tickets/test-ticket/ai-reply", 401, "POST"],
  ["role update protected", "/api/users/test-user/role", 401, "PUT"],
  ["review delete protected", "/api/reviews/test-review", 401, "DELETE"],
];

let failures = 0;
for (const [name, path, expected, method = "GET"] of checks) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify({}),
    });
    const result = response.status === expected ? "PASS" : "FAIL";
    console.log(`${result} ${name}: ${response.status} (expected ${expected})`);
    if (result === "FAIL") failures += 1;
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${name}: ${error.message}`);
  }
}

if (failures) process.exitCode = 1;
else console.log(`PASS all ${checks.length} smoke checks`);
