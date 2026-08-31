import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// VC-4 — the page holds together on a phone in both states (G-4).

test.use({ viewport: { width: 390, height: 844 } });

const measure = () => ({
  overflowsX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  loadTop: Math.round(document.getElementById('load').getBoundingClientRect().top),
  exampleCut: (() => {
    const pre = document.getElementById('contract-example');
    return pre.scrollWidth > pre.clientWidth + 1; // wraps, never scrolls sideways
  })(),
});

test('the empty page never scrolls sideways, and the example is not cut off', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const m = await page.evaluate(measure);
  expect(m.overflowsX).toBe(false);
  expect(m.exampleCut).toBe(false);
  expect(m.loadTop).toBeLessThan(844);   // reachable without scrolling
  expect(m.loadTop).toBeGreaterThan(0);
});

test('a 172-session program does not widen the page either', async ({ page }) => {
  const rehab = JSON.parse(readFileSync('examples/rehab-acl-12wk-am-pm.json', 'utf8'));
  await page.goto('/index.html');
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem('cadence-program', JSON.stringify(p));
  }, rehab);
  await page.reload();

  const m = await page.evaluate(() => ({
    rows: document.querySelectorAll('#program .cdp-row').length,
    overflowsX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  expect(m.rows).toBe(172);
  expect(m.overflowsX).toBe(false);
});
