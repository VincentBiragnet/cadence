import { test, expect } from '@playwright/test';

test('announcements: aria-live only fires for start/complete, valuenow stays current', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(async () => {
    const el = document.createElement('cadence-clock');
    document.body.appendChild(el);
    const announcements = [];
    const observer = new MutationObserver(() => announcements.push(el.querySelector('.cdc-live').textContent));
    observer.observe(el.querySelector('.cdc-live'), { childList: true, characterData: true, subtree: true });
    el.configure({ durationSeconds: 0.3 });
    await new Promise((r) => setTimeout(r, 500));
    observer.disconnect();
    return {
      announcements,
      finalValueNow: el.querySelector('.cdc-bar').getAttribute('aria-valuenow'),
      role: el.querySelector('.cdc-bar').getAttribute('role'),
    };
  });
  expect(result.announcements).toEqual(['Started', 'Complete']);
  expect(result.finalValueNow).toBe('100');
  expect(result.role).toBe('progressbar');
});

test('visual-pulse: a beep is paired with a visible pulse on the bar', async ({ page }) => {
  await page.goto('/index.html');
  const pulsed = await page.evaluate(async () => {
    const el = document.createElement('cadence-clock');
    document.body.appendChild(el);
    let sawPulse = false;
    const observer = new MutationObserver(() => { if (el.hasAttribute('data-pulse')) sawPulse = true; });
    observer.observe(el, { attributes: true, attributeFilter: ['data-pulse'] });
    el.configure({ durationSeconds: 0.2, startFrequency: 440 });
    await new Promise((r) => setTimeout(r, 100));
    observer.disconnect();
    return sawPulse;
  });
  expect(pulsed).toBe(true);
});
