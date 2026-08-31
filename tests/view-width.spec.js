import { test, expect } from '@playwright/test';
import { longTitled } from './view-fixture.mjs';

// VC-4 — a long label must never widen the page (G-1). The native select it
// replaced took its width from its longest option and dragged the layout
// viewport out past the device.

test('sixty sessions with hundred-character titles do not widen a 390px page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html');

  const m = await page.evaluate((p) => {
    const prog = document.getElementById('program');
    localStorage.clear();
    prog.configure(p, { viaLoad: true });
    prog.hidden = false;  // the page opens empty now, so show what we measure
    const rows = [...prog.querySelectorAll('.cdp-row')];
    return {
      innerWidth: window.innerWidth,
      viewWidth: Math.round(prog.querySelector('.cdp-view').getBoundingClientRect().width),
      overflowsX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      longestTitleChars: p.entries[0].sequence.title.length,
      rows: rows.length,
    };
  }, longTitled());

  expect(m.longestTitleChars).toBeGreaterThan(90);
  expect(m.rows).toBe(60);
  expect(m.innerWidth).toBe(390);
  expect(m.viewWidth).toBeLessThanOrEqual(390);
  expect(m.overflowsX).toBe(false);
});

test('the same program does not stretch a row across a wide desktop window', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/index.html');
  const width = await page.evaluate((p) => {
    const prog = document.getElementById('program');
    localStorage.clear();
    prog.configure(p, { viaLoad: true });
    prog.hidden = false;  // the page opens empty now, so show what we measure
    return Math.round(prog.querySelector('.cdp-view').getBoundingClientRect().width);
  }, longTitled());

  // Capped, so a status icon is not stranded a window away from its label.
  expect(width).toBeLessThan(700);
});
