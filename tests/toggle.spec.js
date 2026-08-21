import { test, expect } from '@playwright/test';

test('clicking the chrono text toggles remaining/elapsed', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => document.getElementById('demo').configure({ durationSeconds: 20 }));
  const before = await page.textContent('#demo .cdc-time');
  await page.click('#demo .cdc-time');
  const after = await page.textContent('#demo .cdc-time');
  expect(before).not.toBe(after);
});

test('the toggleMode() method does the same thing as a click', async ({ page }) => {
  await page.goto('/index.html');
  const [before, afterMethod] = await page.evaluate(() => new Promise((resolve) => {
    const el = document.getElementById('demo');
    el.configure({ durationSeconds: 20 });
    // wait for the first tick so .cdc-time reflects the new duration, not
    // the stale text left over from render()'s initial paint
    requestAnimationFrame(() => {
      const before = el.querySelector('.cdc-time').textContent;
      el.toggleMode();
      const after = el.querySelector('.cdc-time').textContent;
      resolve([before, after]);
    });
  }));
  expect(before).not.toBe(afterMethod);
});
