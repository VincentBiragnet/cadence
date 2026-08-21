import { test, expect } from '@playwright/test';

test('total duration is the sum of every block\'s steps × repetitions', async ({ page }) => {
  await page.goto('/index.html');
  const total = await page.evaluate(() => {
    const seq = document.createElement('cadence-sequence');
    document.body.appendChild(seq);
    // block A: 2 steps (5s, 3s) x 2 reps = 16s; block B: 1 step (4s) x 3 reps = 12s
    seq.configure({
      blocks: [
        { repetitions: 2, steps: [{ label: 'a1', durationSeconds: 5 }, { label: 'a2', durationSeconds: 3 }] },
        { repetitions: 3, steps: [{ label: 'b1', durationSeconds: 4 }] },
      ],
    });
    return seq.querySelector('.cds-time').textContent;
  });
  expect(total).toBe('0:28');
});
