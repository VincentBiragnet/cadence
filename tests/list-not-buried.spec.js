import { test, expect } from '@playwright/test';

// VC-3 (G-3) — KD-3. Programme guidance rendered above the list, so opening
// the HSR protocol put the first session row at y=1126 and the Start control
// at y=1642 on an 844px phone: the app opened on a rulebook. Same rule as the
// guidance spec's KD-20 — the unbounded thing goes under the thing you came
// for, not on top of it.

test.use({ viewport: { width: 390, height: 844 } });

async function load(page, file) {
  page.on('dialog', (d) => d.accept());
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.setInputFiles('#program .cdp-load', file);
  // The list is a screen you go to now; this criterion is about what it
  // looks like when you get there.
  await page.evaluate(() => document.getElementById('program')._showList(true));
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll('#program .cdp-row')];
    const g = document.querySelector('#program .cdp-program-guidance');
    const start = document.querySelector('#program .cdp-start');
    const list = document.querySelector('#program .cdp-list');
    return {
      rows: rows.length,
      firstRowTop: Math.round(rows[0].getBoundingClientRect().top),
      startTop: Math.round(start.getBoundingClientRect().top),
      guidanceTop: Math.round(g.getBoundingClientRect().top),
      guidanceShown: g.checkVisibility(),
      listTop: Math.round(list.getBoundingClientRect().top),
      viewport: window.innerHeight,
    };
  });
}

test('the HSR protocol opens on its sessions, not its rulebook', async ({ page }) => {
  const m = await load(page, 'examples/hsr-achilles-12wk.json');
  expect(m.rows).toBe(37);
  // Both of the things you came for, on the first screen.
  expect(m.firstRowTop, `first row at ${m.firstRowTop}`).toBeGreaterThan(0);
  expect(m.firstRowTop, `first row at ${m.firstRowTop}`).toBeLessThan(m.viewport);
  expect(m.startTop, `Start at ${m.startTop}`).toBeLessThan(m.viewport);
  // The rules are still there, underneath.
  expect(m.guidanceShown).toBe(true);
  expect(m.guidanceTop, 'guidance is above the list').toBeGreaterThan(m.listTop);
});

test('a programme with no guidance is unchanged', async ({ page }) => {
  const m = await load(page, 'examples/eight-week-strength.json');
  expect(m.rows).toBe(25);
  expect(m.firstRowTop).toBeLessThan(m.viewport);
  expect(m.guidanceShown).toBe(false);
});
