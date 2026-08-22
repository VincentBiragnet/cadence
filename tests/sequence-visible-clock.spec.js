import { test, expect } from '@playwright/test';

test('visible: the step clock\'s own chrono and bar are shown and reflect the current step', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(async () => {
    const seq = document.createElement('cadence-sequence');
    document.body.appendChild(seq);
    seq.configure({ blocks: [{ repetitions: 1, steps: [{ label: 'A', durationSeconds: 0.4 }] }] });
    const stepClock = seq.querySelector('cadence-clock');
    const visibleBeforeStart = !!stepClock && getComputedStyle(stepClock).display !== 'none';

    seq.querySelector('.cds-start').click();
    await new Promise((r) => setTimeout(r, 150));
    const midFill = parseFloat(stepClock.querySelector('.cdc-bar__fill').style.width);
    const midTime = stepClock.querySelector('.cdc-time').textContent;
    const bigTime = seq.querySelector('.cds-time').textContent;

    return { visibleBeforeStart, midFill, midTime, bigTime, isDistinctElement: stepClock !== seq };
  });
  expect(result.visibleBeforeStart).toBe(true);
  expect(result.midFill).toBeGreaterThan(0);
  expect(result.midFill).toBeLessThan(100);
  // the step clock's own countdown (0.4s step) and the big aggregate (also
  // 0.4s total here) happen to read close but are computed independently —
  // the point is both exist and are visible at once, not that they differ.
  expect(result.midTime).toBeTruthy();
  expect(result.bigTime).toBeTruthy();
  expect(result.isDistinctElement).toBe(true);
});

test('no duplicate: the step clock\'s own live region is aria-hidden, only the sequence\'s own announces', async ({ page }) => {
  // aria-hidden suppresses what a screen reader announces, not whether the
  // DOM mutates — a plain MutationObserver on the whole subtree would "see"
  // the step clock's own Started/Complete text regardless of aria-hidden,
  // which would test something a screen reader user doesn't experience.
  // So: check the aria-hidden attribute directly (the thing that actually
  // matters), and count announcements only from the sequence's own region.
  await page.goto('/index.html');
  const result = await page.evaluate(async () => {
    const seq = document.createElement('cadence-sequence');
    document.body.appendChild(seq);
    seq.configure({
      blocks: [{ repetitions: 1, steps: [
        { label: 'A', durationSeconds: 0.15 },
        { label: 'B', durationSeconds: 0.15 },
      ]}],
    });
    const stepClockLive = seq.querySelector('cadence-clock .cdc-live');
    const ariaHiddenBefore = stepClockLive.getAttribute('aria-hidden');

    const seen = [];
    const observer = new MutationObserver(() => seen.push(seq.querySelector('.cds-live').textContent));
    observer.observe(seq.querySelector('.cds-live'), { childList: true, characterData: true, subtree: true });
    seq.querySelector('.cds-start').click();
    await new Promise((r) => setTimeout(r, 500));
    observer.disconnect();

    return { ariaHiddenBefore, ariaHiddenAfter: stepClockLive.getAttribute('aria-hidden'), announcements: seen };
  });
  expect(result.ariaHiddenBefore).toBe('true');
  expect(result.ariaHiddenAfter).toBe('true'); // still hidden after it changed text mid-run
  expect(result.announcements).toEqual([
    expect.stringContaining('step 1 of 2'),
    expect.stringContaining('step 2 of 2'),
    'Complete',
  ]);
});
