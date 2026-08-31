const { chromium } = require("@playwright/test");

(async () => {
  console.log("=== QWADER STORE BUTTON TEST ===\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });

  const page = await context.newPage();

  const selectors = [
    'button[id="brand-logo-btn"]',
    'button[id="nav-cart-btn"]',
    'button[id="nav-wishlist-btn"]',
    'button[id="nav-compare-btn"]',
    'button[id="nav-user-menu-btn"]',
    'button[id="nav-login-btn"]',
    'button[id="hero-slider-prev-btn"]',
    'button[id="hero-slider-next-btn"]',
    'button[id="view-all-bestsellers-btn"]',
    'button[id="view-all-featured-btn"]',
    'button[id="floating-whatsapp-btn"]',
    'button[id="close-cart-drawer-btn"]',
    'button[id="cart-continue-shopping-btn"]',
    'button[id="clear-cart-btn"]',
    'button[id="apply-promo-btn"]',
    'button[id="remove-promo-btn"]',
    'button[id="mobile-menu-toggle-btn"]',
    'button[id="close-mobile-menu-btn"]',
    'button[id="filter-in-stock-btn"]',
    'button[id="filter-low-stock-btn"]',
    'button[id="reset-filters-btn"]',
    'button[id="product-add-to-cart-btn"]',
    'button[id="product-buy-now-btn"]',
    'button[id="product-detail-wishlist-btn"]',
    'button[id="product-detail-compare-btn"]',
    'button[id="submit-review-btn"]',
    'button[id="review-login-prompt-btn"]',
    'button[id="support-new-ticket-btn"]',
    'button[id="support-whatsapp-btn"]',
    'button[id="tracking-whatsapp-help-btn"]',
    'button[id="order-tracking-submit-btn"]',
    'button[id="copy-simulated-code-btn"]',
    'button[id="dismiss-email-notification-btn"]',
    'button[id="confirm-two-step-verification-btn"]',
    'button[id="resend-code-btn"]',
    'button[aria-label="WhatsApp Support"]',
    'button[aria-label="Close cart drawer"]',
    'button[aria-label="Clear shopping cart"]',
    'button[aria-label="Continue shopping"]',
    'button[title="Close cart"]',
    'button[title="Notifications"]',
    'button[title="Previous Slide"]',
    'button[title="Next Slide"]'
  ];

  const uniqueSelectors = [...new Set(selectors)];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('console.error:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('pageerror:', err.message);
  });

  page.on('requestfailed', req => {
    console.log('requestfailed:', req.url(), req.failure()?.errorText || 'failed');
  });

  try {
    await page.goto('http://localhost:3000/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(700);

    const initialUrl = page.url();
    console.log('Website opened:', initialUrl);

    const results = [];

    for (const selector of uniqueSelectors) {
      const locator = page.locator(selector);
      const count = await locator.count();

      if (count === 0) {
        results.push({ selector, status: 'MISSING' });
        continue;
      }

      const button = locator.first();
      const text = (await button.innerText()).trim();
      const aria = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');
      const id = await button.getAttribute('id');
      const description = text || aria || title || id || '(no label)';

      try {
        await button.scrollIntoViewIfNeeded();
        const visible = await button.isVisible();

        if (!visible) {
          results.push({ selector, description, status: 'NOT_VISIBLE' });
          continue;
        }

        const beforeUrl = page.url();
        await button.click({ timeout: 5000, force: false });
        await page.waitForTimeout(400);
        const afterUrl = page.url();

        results.push({
          selector,
          description,
          status: beforeUrl === afterUrl ? 'OK' : 'URL_CHANGED',
          urlChanged: beforeUrl !== afterUrl,
        });

        if (page.url() !== initialUrl) {
          await page.goto(initialUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
          });
          await page.waitForTimeout(500);
        }
      } catch (error) {
        results.push({
          selector,
          description,
          status: 'FAILED',
          error: error.message
        });
      }
    }

    const failed = results.filter(r => r.status !== 'OK');
    console.log('\nResults:', results.length);
    console.log('Passing selectors:', results.filter(r => r.status === 'OK').length);
    console.log('Problem selectors:', failed.length);

    if (failed.length > 0) {
      console.table(
        failed.map(r => ({
          selector: r.selector,
          status: r.status,
          description: r.description,
          note: r.error || (r.urlChanged ? 'URL changed' : '')
        }))
      );
    }
  } catch (error) {
    console.log('\n✗ TEST FAILED:');
    console.log(error.message);
  }

  await browser.close();
})();
