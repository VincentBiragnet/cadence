import { test, expect } from '@playwright/test';
import { longTitled } from './view-fixture.mjs';

// VC-9 — the controls dock beneath the list and stay put: Start in reach,
// Drop only behind More, the bar naming what Start would run, and a way back
// to the current step (KD-14, KD-21).

test.use({ viewport: { width: 390, height: 844 } });

test('Start stays reachable with the list scrolled to its end, and Drop is not on the surface', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const before = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    const r = prog.querySelector('.cdp-start').getBoundingClientRect();
    return { top: Math.round(r.top), height: Math.round(r.height) };
  }, longTitled());

  const after = await page.evaluate(() => {
    const prog = document.getElementById('prog');
    const list = prog.querySelector('.cdp-list');
    list.scrollTop = list.scrollHeight;      // all the way to week 10
    const r = prog.querySelector('.cdp-start').getBoundingClientRect();
    const drop = prog.querySelector('.cdp-drop').getBoundingClientRect();
    return {
      top: Math.round(r.top),
      startVisible: r.height > 0,
      dropVisible: drop.height > 0,
      dropBehindMenu: Boolean(prog.querySelector('.cdp-pop .cdp-drop')) && prog.querySelector('.cdp-pop').hidden,
    };
  });

  // The bar is not inside the scrolling region, so Start does not move.
  expect(after.top).toBe(before.top);
  expect(after.startVisible).toBe(true);
  expect(after.dropVisible).toBe(false);
  expect(after.dropBehindMenu).toBe(true);
});

test('the bar names the session Start would run, and follows the selection', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const s = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    const first = prog.querySelector('.cdp-next').textContent;
    prog.querySelectorAll('.cdp-row')[12].click();
    return { first, after: prog.querySelector('.cdp-next').textContent,
             label: prog.querySelectorAll('.cdp-row')[12].querySelector('.cdp-row-label').textContent.trim() };
  }, longTitled());

  expect(s.first).toContain('Start will run:');
  expect(s.after).toContain(s.label);   // KD-19: what is armed is what is shown
});

test('the jump goes back to the current step, whatever is selected', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const s = await page.evaluate((p) => {
    // Twelve done, so the current step is row 12 whatever gets selected after.
    p.entries.forEach((e, i) => { if (i < 12) e.actualDate = '2026-01-01'; });
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelectorAll('.cdp-row')[40].click();        // wander off
    const wandered = [...prog.querySelectorAll('.cdp-row')].findIndex((r) => r.getAttribute('aria-selected') === 'true');
    prog.querySelector('.cdp-jump').click();
    const returned = [...prog.querySelectorAll('.cdp-row')].findIndex((r) => r.getAttribute('aria-selected') === 'true');
    return { wandered, returned, next: prog.querySelector('.cdp-next').textContent };
  }, longTitled());

  expect(s.wandered).toBe(40);
  expect(s.returned).toBe(12);          // the soonest neither run nor dropped
  expect(s.next).toContain('Start will run');
});
