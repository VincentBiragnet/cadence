import { test, expect } from '@playwright/test';

test('the displayed total at t=0 matches the precomputed sum', async ({ page }) => {
  await page.goto('/index.html');
  const atStart = await page.evaluate(() => {
    const seq = document.createElement('cadence-sequence');
    document.body.appendChild(seq);
    seq.configure({
      blocks: [{ repetitions: 1, steps: [
        { label: 'A', durationSeconds: 0.2 },
        { label: 'B', durationSeconds: 0.3 },
      ]}],
    });
    return seq.querySelector('.cds-time').textContent;
  });
  expect(atStart).toBe('0:01'); // 0.5s total, rounds to 1s
});

test('aggregate elapsed time (ms) is monotonic and never resets at a step boundary', async ({ page }) => {
  // Samples seq.elapsedMs directly (real ms, not the rounded m:ss display)
  // frequently enough to actually observe the A→B boundary, so a KD-9
  // regression — anchoring to the current step's own elapsed instead of
  // completed-steps-by-config + current-step-elapsed — would show up as a
  // visible drop back toward 0 at ~300ms, not just get rounded away.
  await page.goto('/index.html');
  const samples = await page.evaluate(async () => {
    const seq = document.createElement('cadence-sequence');
    document.body.appendChild(seq);
    seq.configure({
      blocks: [{ repetitions: 1, steps: [
        { label: 'A', durationSeconds: 0.3 },
        { label: 'B', durationSeconds: 0.3 },
      ]}],
    });
    const out = [];
    seq.querySelector('.cds-start').click();
    const start = performance.now();
    while (performance.now() - start < 550) {
      out.push(seq.elapsedMs);
      await new Promise((r) => setTimeout(r, 15));
    }
    return out;
  });

  // Monotonic non-decreasing (small tolerance for frame-timing jitter) —
  // the exact property a reset-at-the-boundary bug would violate.
  for (let i = 1; i < samples.length; i++) {
    expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1] - 5);
  }
  // Must actually cross the ~300ms A/B boundary during the sampling window,
  // or this test isn't exercising the transition at all.
  expect(Math.max(...samples)).toBeGreaterThan(320);
  // And once past the boundary, elapsed must stay past it — never drop back
  // near 0, which is exactly what "reset instead of anchored" would do.
  const pastBoundary = samples.filter((s) => s > 320);
  expect(Math.min(...pastBoundary)).toBeGreaterThan(280);
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
