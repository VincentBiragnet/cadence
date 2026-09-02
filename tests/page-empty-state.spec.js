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
    emptyShown: document.getElementById('empty').checkVisibility(),
    programShown: document.getElementById('program').checkVisibility(),
    liveControls: [...document.querySelectorAll('#program button')]
      .filter((b) => b.getBoundingClientRect().height > 0).length,
    rows: document.querySelectorAll('#program .cdp-row').length,
    loadVisible: document.getElementById('load').getBoundingClientRect().height > 0,
    contractPresent: Boolean(document.getElementById('format')),
    formatLinkShown: document.getElementById('format-link').checkVisibility(),
  }));

  expect(s.emptyShown).toBe(true);
  expect(s.programShown).toBe(false);
  expect(s.liveControls).toBe(0);  // and no ghost buttons rendered under it
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
    emptyShown: document.getElementById('empty').checkVisibility(),
    programShown: document.getElementById('program').checkVisibility(),
    liveControls: [...document.querySelectorAll('#program button')]
      .filter((b) => b.getBoundingClientRect().height > 0).length,
    rows: document.querySelectorAll('#program .cdp-row').length,
    formatLinkShown: document.getElementById('format-link').checkVisibility(),
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
    emptyShown: document.getElementById('empty').checkVisibility(),
    rows: document.querySelectorAll('#program .cdp-row').length,
  }));
  expect(s.emptyShown).toBe(false);
  expect(s.rows).toBeGreaterThan(20);
});

// VC-5, VC-6 — the empty state explains itself in plain English before any
// schema, and index.html is the app rather than a demo of it (G-2, G-5).
test('the empty state explains what a program is before the contract starts', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const s = await page.evaluate(() => {
    const intro = document.querySelector('#empty .intro');
    const contract = document.getElementById('format');
    return {
      intro: intro.textContent.replace(/\s+/g, ' ').trim(),
      introBeforeContract: Boolean(intro.compareDocumentPosition(contract) & Node.DOCUMENT_POSITION_FOLLOWING),
      introTop: Math.round(intro.getBoundingClientRect().top),
      contractTop: Math.round(contract.getBoundingClientRect().top),
    };
  });

  expect(s.intro).toContain('A program is a JSON file');
  expect(s.intro).toContain('week');
  expect(s.intro.length).toBeLessThan(260);      // one sentence, not a manual
  expect(s.introBeforeContract).toBe(true);
  expect(s.introTop).toBeLessThan(s.contractTop);
});

test('the page configures no program of its own on load', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const s = await page.evaluate(() => ({
    config: document.getElementById('program').config,
    stored: localStorage.getItem('cadence-program'),
  }));
  expect(s.config).toBeNull();     // nothing was handed to it
  expect(s.stored).toBeNull();     // and nothing was written behind our back
});
