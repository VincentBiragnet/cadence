import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// VC-1 — with nothing in memory the page leads with loading, and with a
// program stored it opens on that program instead (G-1, KD-1, KD-7).

const example = () => JSON.parse(readFileSync('examples/eight-week-strength.json', 'utf8'));

test('an empty store gives an empty page: the load control, no program', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const s = await page.evaluate(() => ({
    emptyShown: !document.getElementById('empty').hidden,
    programShown: !document.getElementById('program').hidden,
    rows: document.querySelectorAll('#program .cdp-row').length,
    loadVisible: document.getElementById('load').getBoundingClientRect().height > 0,
    contractPresent: Boolean(document.getElementById('format')),
    formatLinkShown: !document.getElementById('format-link').hidden,
  }));

  expect(s.emptyShown).toBe(true);
  expect(s.programShown).toBe(false);
  expect(s.rows).toBe(0);          // nothing is configured behind the scenes
  expect(s.loadVisible).toBe(true);
  expect(s.contractPresent).toBe(true);
  expect(s.formatLinkShown).toBe(false);
});

test('a stored program opens on itself, with the empty state gone', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem('cadence-program', JSON.stringify(p));
  }, example());
  await page.reload();

  const s = await page.evaluate(() => ({
    emptyShown: !document.getElementById('empty').hidden,
    programShown: !document.getElementById('program').hidden,
    rows: document.querySelectorAll('#program .cdp-row').length,
    formatLinkShown: !document.getElementById('format-link').hidden,
  }));

  expect(s.emptyShown).toBe(false);
  expect(s.programShown).toBe(true);
  expect(s.rows).toBe(25);
  expect(s.formatLinkShown).toBe(true);  // KD-5: the format stays reachable
});

test('the example button loads a program without a file', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('#try');

  const s = await page.evaluate(() => ({
    emptyShown: !document.getElementById('empty').hidden,
    rows: document.querySelectorAll('#program .cdp-row').length,
  }));
  expect(s.emptyShown).toBe(false);
  expect(s.rows).toBeGreaterThan(20);
});
