const { chromium } = require("@playwright/test");

(async () => {
  console.log("=== QWADER STORE WEBSITE TEST ===");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 }
  });

  const errors = [];
  const failed = [];

  page.on("console", msg => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  page.on("pageerror", err => {
    errors.push("PAGE ERROR: " + err.message);
  });

  page.on("requestfailed", req => {
    failed.push(req.url() + " | " + (req.failure()?.errorText || "failed"));
  });

  try {
    console.log("\n[1] Opening website...");

    const start = Date.now();

    const response = await page.goto("http://localhost:3000/", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    const loadTime = Date.now() - start;

    console.log("✓ Website opened");
    console.log("✓ HTTP:", response ? response.status() : "unknown");
    console.log("✓ Load time:", loadTime + " ms");
    console.log("✓ Title:", await page.title());

    console.log("\n[2] Checking page elements...");

    const buttons = await page.locator("button").count();
    const links = await page.locator("a").count();
    const inputs = await page.locator("input").count();
    const images = await page.locator("img").count();

    console.log("Buttons:", buttons);
    console.log("Links:", links);
    console.log("Inputs:", inputs);
    console.log("Images:", images);

    console.log("\n[3] Checking empty buttons...");

    let emptyButtons = 0;

    for (let i = 0; i < buttons; i++) {
      const button = page.locator("button").nth(i);

      const text = (await button.innerText()).trim();
      const aria = await button.getAttribute("aria-label");
      const title = await button.getAttribute("title");

      if (!text && !aria && !title) {
        emptyButtons++;
        console.log("⚠ Empty button #" + (i + 1));
      }
    }

    if (emptyButtons === 0) {
      console.log("✓ No empty buttons detected");
    }

    console.log("\n[4] Checking links...");

    let badLinks = 0;

    for (let i = 0; i < links; i++) {
      const link = page.locator("a").nth(i);
      const href = await link.getAttribute("href");

      if (!href || href === "#") {
        badLinks++;
        console.log("⚠ Empty/bad link #" + (i + 1) + ":", href);
      }
    }

    if (badLinks === 0) {
      console.log("✓ No empty links detected");
    }

    console.log("\n[5] Checking JavaScript errors...");

    if (errors.length === 0) {
      console.log("✓ No JavaScript errors");
    } else {
      console.log("✗ JavaScript errors:", errors.length);

      errors.forEach((error, i) => {
        console.log("  " + (i + 1) + ". " + error);
      });
    }

    console.log("\n[6] Checking failed network requests...");

    if (failed.length === 0) {
      console.log("✓ No failed requests");
    } else {
      console.log("✗ Failed requests:", failed.length);

      failed.forEach((request, i) => {
        console.log("  " + (i + 1) + ". " + request);
      });
    }

    console.log("\n[7] Mobile test...");

    await page.setViewportSize({
      width: 390,
      height: 844
    });

    await page.reload({
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    const bodyWidth = await page.locator("body").evaluate(
      element => element.scrollWidth
    );

    console.log("Mobile page loaded");

    if (bodyWidth > 395) {
      console.log(
        "⚠ Horizontal overflow detected:",
        bodyWidth + "px"
      );
    } else {
      console.log("✓ No obvious horizontal overflow");
    }

    console.log("\n[8] Taking screenshots...");

    await page.screenshot({
      path: "qwader-desktop-test.png",
      fullPage: true
    });

    await page.setViewportSize({
      width: 390,
      height: 844
    });

    await page.screenshot({
      path: "qwader-mobile-test.png",
      fullPage: true
    });

    console.log("✓ Desktop screenshot: qwader-desktop-test.png");
    console.log("✓ Mobile screenshot: qwader-mobile-test.png");

    console.log("\n==============================");
    console.log("       TEST SUMMARY");
    console.log("==============================");

    console.log("Load time:", loadTime + " ms");
    console.log("Buttons:", buttons);
    console.log("Empty buttons:", emptyButtons);
    console.log("Links:", links);
    console.log("Bad links:", badLinks);
    console.log("Inputs:", inputs);
    console.log("Images:", images);
    console.log("JavaScript errors:", errors.length);
    console.log("Failed requests:", failed.length);

    console.log("\n=== TEST FINISHED ===");

  } catch (error) {
    console.log("\n✗ TEST ERROR:");
    console.log(error.message);
  }

  await browser.close();
})();
