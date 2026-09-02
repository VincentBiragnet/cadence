import { test, expect } from '@playwright/test';
import { longTitled } from './view-fixture.mjs';

// VC-3, VC-5 — every control is big enough to press one-handed, and the menu
// closes the way a menu closes (G-3, G-5, KD-4).

test.use({ viewport: { width: 390, height: 844 } });

test('no control in the program view is smaller than 44 pixels either way', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const small = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelector('.cdp-more').click();     // measure the menu open
    return [...prog.querySelectorAll('button, .cdp-load-label')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { cls: el.className, w: Math.round(r.width), h: Math.round(r.height) };
      })
      .filter((m) => m.h > 0 && (m.w < 44 || m.h < 44));
  }, longTitled());

  expect(small).toEqual([]);
});

test('Escape closes the menu and hands focus back to its button', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelector('.cdp-more').click();
  }, longTitled());

  const open = await page.evaluate(() => !document.querySelector('#prog .cdp-pop').hidden);
  await page.locator('#prog .cdp-export').focus();
  await page.keyboard.press('Escape');
  const after = await page.evaluate(() => ({
    closed: document.querySelector('#prog .cdp-pop').hidden,
    focus: document.activeElement.className,
    expanded: document.querySelector('#prog .cdp-more').getAttribute('aria-expanded'),
  }));

  expect(open).toBe(true);
  expect(after.closed).toBe(true);
  expect(after.focus).toContain('cdp-more');
  expect(after.expanded).toBe('false');
});

test('a press outside the menu closes it', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelector('.cdp-more').click();
  }, longTitled());

  expect(await page.evaluate(() => !document.querySelector('#prog .cdp-pop').hidden)).toBe(true);
  await page.mouse.click(5, 5);
  expect(await page.evaluate(() => document.querySelector('#prog .cdp-pop').hidden)).toBe(true);
});
