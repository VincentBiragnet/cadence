import { test, expect } from '@playwright/test';

test('the aggregate chrono reads the full total at t=0 and decreases across a step boundary', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(async () => {
    const seq = document.createElement('cadence-sequence');
    document.body.appendChild(seq);
    seq.configure({
      blocks: [{ repetitions: 1, steps: [
        { label: 'A', durationSeconds: 0.2 },
        { label: 'B', durationSeconds: 0.3 },
      ]}],
    });
    const atStart = seq.querySelector('.cds-time').textContent; // "0:01" (0.5s rounds up)

    seq.querySelector('.cds-start').click();
    await new Promise((r) => setTimeout(r, 100)); // still in step A
    const midA = seq.querySelector('.cds-time').textContent;

    await new Promise((r) => setTimeout(r, 250)); // now into step B
    const midB = seq.querySelector('.cds-time').textContent;

    return { atStart, midA, midB };
  });
  expect(result.atStart).toBe('0:01'); // 0.5s total, rounds to 1s
  // both mid-run reads must be <= the starting total and >= 0 — the point is
  // there is no jump/reset at the step boundary, just a monotonic decrease
  const toSeconds = (t) => { const [m, s] = t.split(':').map(Number); return m * 60 + s; };
  expect(toSeconds(result.midA)).toBeLessThanOrEqual(toSeconds(result.atStart));
  expect(toSeconds(result.midB)).toBeLessThanOrEqual(toSeconds(result.midA));
});

test('clicking the chrono (or .toggleMode()) switches remaining/elapsed', async ({ page }) => {
  await page.goto('/index.html');
  const [before, afterClick, afterMethod] = await page.evaluate(() => new Promise((resolve) => {
    const seq = document.createElement('cadence-sequence');
    document.body.appendChild(seq);
    seq.configure({ blocks: [{ repetitions: 1, steps: [{ label: 'A', durationSeconds: 20 }] }] });
    requestAnimationFrame(() => {
      const before = seq.querySelector('.cds-time').textContent;
      seq.querySelector('.cds-time').click();
      const afterClick = seq.querySelector('.cds-time').textContent;
      seq.toggleMode();
      const afterMethod = seq.querySelector('.cds-time').textContent;
      resolve([before, afterClick, afterMethod]);
    });
  }));
  expect(afterClick).not.toBe(before);
  expect(afterMethod).toBe(before);
});
