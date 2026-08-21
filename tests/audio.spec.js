import { test, expect } from '@playwright/test';

test('start: a beep at startFrequency fires within one frame of t=0', async ({ page }) => {
  await page.goto('/index.html');
  const detail = await page.evaluate(async () => {
    const el = document.createElement('cadence-clock');
    document.body.appendChild(el);
    let first = null;
    el.addEventListener('cadence:beep', (e) => { if (!first) first = e.detail; });
    el.configure({ durationSeconds: 5, startFrequency: 523 });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return first;
  });
  expect(detail).toEqual({ frequency: 523, edge: 'start' });
});

test('end: a beep at endFrequency fires at completion, distinct from start', async ({ page }) => {
  await page.goto('/index.html');
  const events = await page.evaluate(async () => {
    const el = document.createElement('cadence-clock');
    document.body.appendChild(el);
    const seen = [];
    el.addEventListener('cadence:beep', (e) => seen.push(e.detail));
    el.configure({ durationSeconds: 0.2, startFrequency: 440, endFrequency: 660 });
    await new Promise((r) => setTimeout(r, 400));
    return seen;
  });
  expect(events).toEqual([
    { frequency: 440, edge: 'start' },
    { frequency: 660, edge: 'end' },
  ]);
});

test('partial: only endFrequency given, no beep at t=0, one beep at completion', async ({ page }) => {
  await page.goto('/index.html');
  const events = await page.evaluate(async () => {
    const el = document.createElement('cadence-clock');
    document.body.appendChild(el);
    const seen = [];
    el.addEventListener('cadence:beep', (e) => seen.push(e.detail));
    el.configure({ durationSeconds: 0.2, endFrequency: 660 });
    await new Promise((r) => setTimeout(r, 400));
    return seen;
  });
  expect(events).toEqual([{ frequency: 660, edge: 'end' }]);
});
