import { test, expect } from '@playwright/test';

test('the Start click unlocks Web Audio for the hidden per-step clock', async ({ page }) => {
  await page.goto('/index.html');
  const state = await page.evaluate(async () => {
    const seq = document.createElement('cadence-sequence');
    document.body.appendChild(seq);
    seq.configure({
      blocks: [{ repetitions: 1, steps: [{ label: 'A', durationSeconds: 0.2, startFrequency: 440 }] }],
    });
    seq.querySelector('.cds-start').click();
    await new Promise((r) => setTimeout(r, 200));
    const hidden = seq.querySelector('cadence-clock');
    return hidden._audioCtx?.state;
  });
  expect(state).toBe('running');
});
