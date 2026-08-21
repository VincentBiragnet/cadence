import { test, expect } from '@playwright/test';

test('cadence:complete and onComplete each fire exactly once at the end of the program', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(async () => {
    const seq = document.createElement('cadence-sequence');
    document.body.appendChild(seq);
    let completeEvents = 0;
    let onCompleteCalls = 0;
    seq.addEventListener('cadence:complete', () => { completeEvents += 1; });
    seq.configure({
      blocks: [
        { repetitions: 2, steps: [{ label: 'A', durationSeconds: 0.1 }] },
      ],
      onComplete: () => { onCompleteCalls += 1; },
    });
    seq.querySelector('.cds-start').click();
    await new Promise((r) => setTimeout(r, 500));
    return { completeEvents, onCompleteCalls, hasDone: seq.hasAttribute('data-done') };
  });
  expect(result).toEqual({ completeEvents: 1, onCompleteCalls: 1, hasDone: true });
});
