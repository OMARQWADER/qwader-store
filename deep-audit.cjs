const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const REPORT_DIR = path.join(process.cwd(), "deep-audit-report");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots");

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];
const visited = new Set();
const discoveredRoutes = new Set();

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  info: 0,
};

function addResult({
  severity = "INFO",
  category,
  test,
  page = "",
  message,
  details = "",
}) {
  const item = {
    severity,
    category,
    test,
    page,
    message,
    details,
    time: new Date().toISOString(),
  };

  results.push(item);

  stats.total++;

  if (severity === "PASS") stats.passed++;
  else if (severity === "FAIL") stats.failed++;
  else if (severity === "CRITICAL") stats.critical++;
  else if (severity === "HIGH") stats.high++;
  else if (severity === "MEDIUM") stats.medium++;
  else if (severity === "LOW") stats.low++;
  else if (severity === "INFO") stats.info++;
  else if (severity === "WARNING") stats.warnings++;
}

function normalizeUrl(url) {
  try {
    const u = new URL(url, BASE_URL);

    if (u.origin !== new URL(BASE_URL).origin) return null;

    u.hash = "";

    return u.href;
  } catch {
    return null;
  }
}

function isInternal(url) {
  try {
    return new URL(url).origin === new URL(BASE_URL).origin;
  } catch {
    return false;
  }
}

function safeString(value, max = 5000) {
  if (value === undefined || value === null) return "";
  return String(value).slice(0, max);
}

async function checkReachability() {
  console.log("\nChecking site reachability...");

  const response = await fetch(BASE_URL);

  if (!response.ok) {
    addResult({
      severity: "CRITICAL",
      category: "availability",
      test: "base-url",
      page: BASE_URL,
      message: `Site returned HTTP ${response.status}`,
    });

    throw new Error(`Site unreachable: ${response.status}`);
  }

  addResult({
    severity: "PASS",
    category: "availability",
    test: "base-url",
    page: BASE_URL,
    message: "Site is reachable",
  });
}

async function discoverRoutes(browser) {
  console.log("\nDiscovering routes...");

  const page = await browser.newPage();

  const queue = [BASE_URL];

  while (queue.length && discoveredRoutes.size < 150) {
    const current = queue.shift();

    if (!current || visited.has(current)) continue;

    visited.add(current);

    try {
      await page.goto(current, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      const links = await page.locator("a[href]").evaluateAll((els) =>
        els.map((e) => e.href).filter(Boolean)
      );

      for (const link of links) {
        const normalized = normalizeUrl(link);

        if (
          normalized &&
          isInternal(normalized) &&
          !discoveredRoutes.has(normalized)
        ) {
          discoveredRoutes.add(normalized);

          if (!visited.has(normalized)) {
            queue.push(normalized);
          }
        }
      }

      const anchors = await page.locator("[data-route], [href]").evaluateAll(
        (els) =>
          els
            .map((e) => e.getAttribute("data-route") || e.getAttribute("href"))
            .filter(Boolean)
      );

      for (const value of anchors) {
        if (value.startsWith("#")) {
          discoveredRoutes.add(BASE_URL + value);
        }
      }
    } catch (error) {
      addResult({
        severity: "LOW",
        category: "discovery",
        test: "route-discovery",
        page: current,
        message: "Could not inspect route",
        details: error.message,
      });
    }
  }

  discoveredRoutes.add(BASE_URL);

  await page.close();

  console.log(`Discovered ${discoveredRoutes.size} candidate routes.`);
}

async function inspectPage(browser, url) {
  console.log(`  -> ${url}`);

  const page = await browser.newPage({
    viewport: {
      width: 1440,
      height: 900,
    },
  });

  const consoleErrors = [];
  const jsErrors = [];
  const failedRequests = [];
  const httpErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (error) => {
    jsErrors.push(error.message);
  });

  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || "unknown",
    });
  });

  page.on("response", (response) => {
    if (response.status() >= 400) {
      httpErrors.push({
        url: response.url(),
        status: response.status(),
      });
    }
  });

  try {
    const start = Date.now();

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    const loadTime = Date.now() - start;

    if (!response) {
      addResult({
        severity: "LOW",
        category: "navigation",
        test: "page-load",
        page: url,
        message: "No response object returned",
      });
    } else if (response.status() >= 400) {
      addResult({
        severity: "HIGH",
        category: "navigation",
        test: "page-load",
        page: url,
        message: `HTTP ${response.status()}`,
      });
    } else {
      addResult({
        severity: "PASS",
        category: "navigation",
        test: "page-load",
        page: url,
        message: `Page loaded in ${loadTime}ms`,
      });
    }

    await page.waitForTimeout(500);

    // -------------------------
    // JavaScript errors
    // -------------------------

    for (const error of jsErrors) {
      addResult({
        severity: "HIGH",
        category: "javascript",
        test: "pageerror",
        page: url,
        message: "JavaScript page error",
        details: safeString(error),
      });
    }

    for (const error of consoleErrors) {
      addResult({
        severity: "MEDIUM",
        category: "javascript",
        test: "console-error",
        page: url,
        message: "Console error detected",
        details: safeString(error),
      });
    }

    // -------------------------
    // Network
    // -------------------------

    for (const request of failedRequests) {
      addResult({
        severity: "MEDIUM",
        category: "network",
        test: "failed-request",
        page: url,
        message: "Network request failed",
        details: JSON.stringify(request),
      });
    }

    for (const error of httpErrors) {
      addResult({
        severity: "MEDIUM",
        category: "http",
        test: "http-error",
        page: url,
        message: `HTTP ${error.status}`,
        details: error.url,
      });
    }

    // -------------------------
    // Buttons
    // -------------------------

    const buttons = await page.locator("button").count();

    addResult({
      severity: "INFO",
      category: "ui",
      test: "button-count",
      page: url,
      message: `${buttons} buttons detected`,
    });

    for (let i = 0; i < buttons; i++) {
      const button = page.locator("button").nth(i);

      try {
        const visible = await button.isVisible().catch(() => false);

        if (!visible) continue;

        const text = safeString(
          await button.innerText().catch(() => ""),
          200
        );

        const aria = await button.getAttribute("aria-label");

        if (!text.trim() && !aria) {
          addResult({
            severity: "LOW",
            category: "accessibility",
            test: "button-accessible-name",
            page: url,
            message: "Button has no accessible name",
          });
        }
      } catch {}
    }

    // -------------------------
    // Links
    // -------------------------

    const links = await page.locator("a").count();

    addResult({
      severity: "INFO",
      category: "ui",
      test: "link-count",
      page: url,
      message: `${links} links detected`,
    });

    // -------------------------
    // Forms
    // -------------------------

    const forms = await page.locator("form").count();

    addResult({
      severity: "INFO",
      category: "forms",
      test: "form-count",
      page: url,
      message: `${forms} forms detected`,
    });

    const inputs = await page.locator(
      "input, textarea, select"
    ).count();

    addResult({
      severity: "INFO",
      category: "forms",
      test: "input-count",
      page: url,
      message: `${inputs} form controls detected`,
    });

    // -------------------------
    // Images / accessibility
    // -------------------------

    const images = await page.locator("img").evaluateAll((imgs) =>
      imgs.map((img) => ({
        src: img.getAttribute("src"),
        alt: img.getAttribute("alt"),
      }))
    );

    for (const img of images) {
      if (!img.alt || !img.alt.trim()) {
        addResult({
          severity: "LOW",
          category: "accessibility",
          test: "image-alt",
          page: url,
          message: "Image without alt text",
          details: safeString(img.src, 1000),
        });
      }
    }

    // -------------------------
    // Duplicate IDs
    // -------------------------

    const duplicateIds = await page.evaluate(() => {
      const map = {};

      document.querySelectorAll("[id]").forEach((el) => {
        const id = el.id;
        map[id] = (map[id] || 0) + 1;
      });

      return Object.entries(map)
        .filter(([, count]) => count > 1)
        .map(([id, count]) => ({ id, count }));
    });

    for (const duplicate of duplicateIds) {
      addResult({
        severity: "MEDIUM",
        category: "accessibility",
        test: "duplicate-id",
        page: url,
        message: `Duplicate ID: ${duplicate.id}`,
        details: `Occurrences: ${duplicate.count}`,
      });
    }

    // -------------------------
    // Storage
    // -------------------------

    const storage = await page.evaluate(() => ({
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage),
      cookies: document.cookie,
    }));

    addResult({
      severity: "INFO",
      category: "storage",
      test: "browser-storage",
      page: url,
      message: "Browser storage inspected",
      details: JSON.stringify({
        localStorageKeys: storage.localStorage,
        sessionStorageKeys: storage.sessionStorage,
        cookieNames: storage.cookies
          .split(";")
          .map((x) => x.trim().split("=")[0])
          .filter(Boolean),
      }),
    });

    // -------------------------
    // Sensitive-looking storage
    // -------------------------

    const sensitivePattern =
      /(password|passwd|secret|token|private|api[_-]?key|authorization|access[_-]?token|refresh[_-]?token)/i;

    const suspiciousStorage = [
      ...storage.localStorage,
      ...storage.sessionStorage,
    ].filter((key) => sensitivePattern.test(key));

    for (const key of suspiciousStorage) {
      addResult({
        severity: "HIGH",
        category: "security",
        test: "sensitive-storage-key",
        page: url,
        message: `Sensitive-looking storage key detected: ${key}`,
      });
    }

    // -------------------------
    // Performance
    // -------------------------

    const performanceData = await page.evaluate(() => {
      const entries = performance.getEntriesByType("resource");

      return {
        resourceCount: entries.length,
        transferSize: entries.reduce(
          (sum, x) => sum + (x.transferSize || 0),
          0
        ),
      };
    });

    addResult({
      severity: "INFO",
      category: "performance",
      test: "resource-size",
      page: url,
      message: `${performanceData.resourceCount} resources`,
      details: `Approx transfer size: ${performanceData.transferSize} bytes`,
    });

    // -------------------------
    // Screenshot
    // -------------------------

    const safeName =
      url
        .replace(/^https?:\/\//, "")
        .replace(/[^a-z0-9]+/gi, "_")
        .slice(0, 100) || "page";

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${safeName}.png`),
      fullPage: true,
    });
  } catch (error) {
    addResult({
      severity: "HIGH",
      category: "navigation",
      test: "inspect-page",
      page: url,
      message: "Page inspection failed",
      details: error.message,
    });
  } finally {
    await page.close();
  }
}

async function checkSecurityHeaders() {
  console.log("\nChecking security headers...");

  const response = await fetch(BASE_URL);

  const headers = response.headers;

  const required = [
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
  ];

  for (const header of required) {
    if (!headers.get(header)) {
      addResult({
        severity: "LOW",
        category: "security",
        test: "security-header",
        page: BASE_URL,
        message: `Missing security header: ${header}`,
      });
    } else {
      addResult({
        severity: "PASS",
        category: "security",
        test: "security-header",
        page: BASE_URL,
        message: `Security header present: ${header}`,
      });
    }
  }
}

async function scanSourceFiles() {
  console.log("\nScanning source files...");

  const srcDir = path.join(process.cwd(), "src");

  if (!fs.existsSync(srcDir)) {
    addResult({
      severity: "INFO",
      category: "source",
      test: "source-scan",
      message: "src directory not found",
    });

    return;
  }

  const files = [];

  function walk(dir) {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        if (
          !["node_modules", ".git", "dist", "build"].includes(item)
        ) {
          walk(full);
        }
      } else {
        if (/\.(js|jsx|ts|tsx|json|env)$/i.test(item)) {
          files.push(full);
        }
      }
    }
  }

  walk(srcDir);

  const patterns = [
    /AIza[0-9A-Za-z_-]{20,}/g,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    /sk-[A-Za-z0-9_-]{20,}/g,
    /password\s*[:=]\s*["'`][^"'`]{6,}/gi,
    /secret\s*[:=]\s*["'`][^"'`]{6,}/gi,
  ];

  for (const file of files) {
    let content = "";

    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        addResult({
          severity: "HIGH",
          category: "source-security",
          test: "secret-pattern",
          page: file,
          message: "Potential sensitive value pattern detected",
          details: "Value intentionally omitted from report.",
        });

        break;
      }
    }
  }

  addResult({
    severity: "INFO",
    category: "source",
    test: "source-scan",
    message: `Scanned ${files.length} source files`,
  });
}

async function testAdminWithoutAuthentication(browser) {
  console.log("\nTesting admin access without authentication...");

  const candidates = [
    "/admin",
    "/admin/",
    "/admin/dashboard",
    "/dashboard",
    "/manage",
    "/management",
    "/control",
    "/control-panel",
    "/administrator",
    "/#admin",
    "/#/admin",
    "/#admin-dashboard",
  ];

  for (const route of candidates) {
    const page = await browser.newPage();

    const target = new URL(route, BASE_URL).href;

    try {
      const response = await page.goto(target, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      const status = response?.status() ?? null;

      const body = (
        await page.locator("body").innerText().catch(() => "")
      ).toLowerCase();

      const adminWords =
        /admin|dashboard|administrator|لوحة|الإدارة|ادمن|إدارة الموقع/.test(
          body
        );

      const loginWords =
        /login|sign in|تسجيل الدخول|دخول|password|كلمة المرور/.test(
          body
        );

      if (adminWords && !loginWords) {
        addResult({
          severity: "HIGH",
          category: "authorization",
          test: "unauthenticated-admin-access",
          page: target,
          message:
            "Possible admin content accessible without obvious authentication",
          details: `HTTP ${status}`,
        });
      } else {
        addResult({
          severity: "PASS",
          category: "authorization",
          test: "unauthenticated-admin-access",
          page: target,
          message: "No obvious unauthenticated admin content detected",
          details: `HTTP ${status}`,
        });
      }
    } catch (error) {
      addResult({
        severity: "INFO",
        category: "authorization",
        test: "admin-route",
        page: target,
        message: "Admin route could not be inspected",
        details: error.message,
      });
    } finally {
      await page.close();
    }
  }
}

async function testResponsive(browser) {
  console.log("\nRunning responsive checks...");

  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "laptop", width: 1280, height: 800 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
    { name: "small-mobile", width: 360, height: 800 },
  ];

  const page = await browser.newPage();

  for (const viewport of viewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    try {
      await page.goto(BASE_URL, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      if (overflow.scrollWidth > overflow.clientWidth + 5) {
        addResult({
          severity: "LOW",
          category: "responsive",
          test: "horizontal-overflow",
          page: BASE_URL,
          message: `Horizontal overflow at ${viewport.name}`,
          details: JSON.stringify(overflow),
        });
      } else {
        addResult({
          severity: "PASS",
          category: "responsive",
          test: "horizontal-overflow",
          page: BASE_URL,
          message: `No horizontal overflow at ${viewport.name}`,
        });
      }
    } catch (error) {
      addResult({
        severity: "LOW",
        category: "responsive",
        test: "viewport",
        page: BASE_URL,
        message: `Viewport ${viewport.name} failed`,
        details: error.message,
      });
    }
  }

  await page.close();
}

async function testFormsSafely(browser) {
  console.log("\nTesting forms with harmless test values...");

  const page = await browser.newPage();

  try {
    await page.goto(BASE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    const controls = await page.locator(
      "input, textarea"
    ).count();

    for (let i = 0; i < controls; i++) {
      const element = page.locator(
        "input, textarea"
      ).nth(i);

      try {
        if (!(await element.isVisible())) continue;

        const type =
          (await element.getAttribute("type")) || "text";

        if (type === "password") {
          await element.fill("TEST_ONLY_PASSWORD_NOT_REAL");
        } else if (
          type === "email"
        ) {
          await element.fill("audit@example.invalid");
        } else {
          await element.fill("AUDIT_TEST_VALUE");
        }
      } catch {}
    }

    addResult({
      severity: "PASS",
      category: "forms",
      test: "safe-form-fill",
      page: BASE_URL,
      message: `Safely filled ${controls} form controls with non-real test data`,
    });
  } catch (error) {
    addResult({
      severity: "LOW",
      category: "forms",
      test: "safe-form-fill",
      page: BASE_URL,
      message: "Form test could not complete",
      details: error.message,
    });
  } finally {
    await page.close();
  }
}

function createTextReport() {
  const lines = [];

  lines.push("======================================");
  lines.push(" QWADER STORE - DEEP AUDIT REPORT");
  lines.push("======================================");
  lines.push("");
  lines.push(`Base URL: ${BASE_URL}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  lines.push("--- SUMMARY ---");
  lines.push(`Total: ${stats.total}`);
  lines.push(`Passed: ${stats.passed}`);
  lines.push(`Failed: ${stats.failed}`);
  lines.push(`Warnings: ${stats.warnings}`);
  lines.push(`Critical: ${stats.critical}`);
  lines.push(`High: ${stats.high}`);
  lines.push(`Medium: ${stats.medium}`);
  lines.push(`Low: ${stats.low}`);
  lines.push(`Info: ${stats.info}`);
  lines.push("");

  lines.push("--- FINDINGS ---");

  for (const item of results) {
    lines.push("");
    lines.push(
      `[${item.severity}] (${item.category}) ${item.test}`
    );

    if (item.page) {
      lines.push(`Page: ${item.page}`);
    }

    lines.push(`Message: ${item.message}`);

    if (item.details) {
      lines.push(`Details: ${item.details}`);
    }
  }

  lines.push("");
  lines.push("--- IMPORTANT LIMITATIONS ---");
  lines.push(
    "This audit is non-destructive and does not attempt password cracking, destructive database operations, or deletion of real data."
  );
  lines.push(
    "A PASS result does not mathematically prove that a security control is perfect."
  );
  lines.push(
    "Server-side authorization and database rules require application-specific testing."
  );

  fs.writeFileSync(
    path.join(REPORT_DIR, "deep-audit-report.txt"),
    lines.join("\n"),
    "utf8"
  );
}

function createJsonReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    stats,
    routes: [...discoveredRoutes],
    results,
  };

  fs.writeFileSync(
    path.join(REPORT_DIR, "deep-audit-report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );
}

function createHtmlReport() {
  const rows = results
    .map(
      (r) => `
<tr>
<td>${escapeHtml(r.severity)}</td>
<td>${escapeHtml(r.category)}</td>
<td>${escapeHtml(r.test)}</td>
<td>${escapeHtml(r.page)}</td>
<td>${escapeHtml(r.message)}</td>
<td>${escapeHtml(r.details)}</td>
</tr>`
    )
    .join("");

  const html = `
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>QWADER STORE - Deep Audit</title>
<style>
body {
  font-family: Arial, sans-serif;
  margin: 30px;
  background: #f5f5f5;
}
h1 { margin-bottom: 5px; }
.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit,minmax(130px,1fr));
  gap: 10px;
  margin: 20px 0;
}
.card {
  background: white;
  padding: 15px;
  border-radius: 8px;
}
table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
  vertical-align: top;
}
th {
  background: #eee;
}
</style>
</head>
<body>

<h1>QWADER STORE - Deep Audit</h1>
<div>Target: ${escapeHtml(BASE_URL)}</div>

<div class="summary">
<div class="card"><b>Total</b><br>${stats.total}</div>
<div class="card"><b>Passed</b><br>${stats.passed}</div>
<div class="card"><b>Failed</b><br>${stats.failed}</div>
<div class="card"><b>Critical</b><br>${stats.critical}</div>
<div class="card"><b>High</b><br>${stats.high}</div>
<div class="card"><b>Medium</b><br>${stats.medium}</div>
<div class="card"><b>Low</b><br>${stats.low}</div>
</div>

<table>
<thead>
<tr>
<th>Severity</th>
<th>Category</th>
<th>Test</th>
<th>Page</th>
<th>Message</th>
<th>Details</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>

</body>
</html>
`;

  fs.writeFileSync(
    path.join(REPORT_DIR, "deep-audit-report.html"),
    html,
    "utf8"
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function main() {
  console.log("==========================================");
  console.log(" QWADER STORE - COMPLETE DEEP AUDIT");
  console.log("==========================================");
  console.log(`Target: ${BASE_URL}`);
  console.log("");

  try {
    await checkReachability();

    const browser = await chromium.launch({
      headless: false,
    });

    try {
      await discoverRoutes(browser);

      await checkSecurityHeaders();

      await scanSourceFiles();

      const routes = [...discoveredRoutes].slice(0, 100);

      console.log(
        `\nAuditing ${routes.length} discovered routes...`
      );

      for (const route of routes) {
        await inspectPage(browser, route);
      }

      await testAdminWithoutAuthentication(browser);

      await testFormsSafely(browser);

      await testResponsive(browser);
    } finally {
      await browser.close();
    }

    createTextReport();
    createJsonReport();
    createHtmlReport();

    console.log("\n==========================================");
    console.log("             TEST COMPLETE");
    console.log("==========================================");
    console.log(`Total: ${stats.total}`);
    console.log(`Passed: ${stats.passed}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Warnings: ${stats.warnings}`);
    console.log(`Critical: ${stats.critical}`);
    console.log(`High: ${stats.high}`);
    console.log(`Medium: ${stats.medium}`);
    console.log(`Low: ${stats.low}`);
    console.log("");
    console.log(`Reports: ${REPORT_DIR}`);
    console.log(" - deep-audit-report.txt");
    console.log(" - deep-audit-report.json");
    console.log(" - deep-audit-report.html");
    console.log(" - screenshots/");
  } catch (error) {
    console.error("\nFATAL ERROR:");
    console.error(error);
    process.exitCode = 1;
  }
}

main();