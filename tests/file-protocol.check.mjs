// Not a Playwright *test* file (playwright.config.js's webServer serves over
// http, but this specifically checks the file:// case that VC-13 is about),
// so it's a standalone script: launch a browser, load index.html directly
// off disk, and assert the demo clock actually works. Exit 0/1 for `verify --run`.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const url = `file://${join(root, 'index.html')}`;

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(url);
await page.waitForTimeout(300);
const timeText = await page.textContent('#demo .cdc-time').catch(() => null);
await browser.close();

if (errors.length > 0) {
  console.error('console/page errors while loading via file://:', errors);
  process.exit(1);
}
if (timeText !== '0:20') {
  console.error(`expected the demo clock to read 0:20, got ${JSON.stringify(timeText)}`);
  process.exit(1);
}
console.log(`ok: index.html loaded via file:// with no errors, demo clock reads ${timeText}`);
