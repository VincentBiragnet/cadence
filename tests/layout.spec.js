import { test, expect } from '@playwright/test';

test('chrono and bar sit side by side on one line, even narrow', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 600 });
  await page.goto('/parts.html');
  const box = await page.evaluate(() => {
    const el = document.getElementById('demo');
    const time = el.querySelector('.cdc-time').getBoundingClientRect();
    const bar = el.querySelector('.cdc-bar').getBoundingClientRect();
    return { timeRight: time.right, barLeft: bar.left, rowsOverlap: time.top < bar.bottom && bar.top < time.bottom };
  });
  expect(box.timeRight).toBeLessThanOrEqual(box.barLeft);
  expect(box.rowsOverlap).toBe(true);
});
