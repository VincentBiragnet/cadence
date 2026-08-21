import { test, expect } from '@playwright/test';

test('no frequency: completes with zero oscillator starts', async ({ page }) => {
  await page.goto('/index.html');
  const beeps = await page.evaluate(async () => {
    const el = document.createElement('cadence-clock');
    document.body.appendChild(el);
    const seen = [];
    el.addEventListener('cadence:beep', (e) => seen.push(e.detail));
    el.configure({ durationSeconds: 0.2 });
    await new Promise((r) => setTimeout(r, 400));
    return seen;
  });
  expect(beeps).toEqual([]);
});
