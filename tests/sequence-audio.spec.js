import { test, expect } from '@playwright/test';

test('each step\'s beep matches its own config as the sequence runs', async ({ page }) => {
  await page.goto('/index.html');
  const events = await page.evaluate(async () => {
    const seq = document.createElement('cadence-sequence');
    document.body.appendChild(seq);
    const seen = [];
    seq.addEventListener('cadence:beep', (e) => seen.push(e.detail));
    seq.configure({
      blocks: [
        { repetitions: 1, steps: [
          { label: 'A', durationSeconds: 0.15, startFrequency: 300 },
          { label: 'B', durationSeconds: 0.15, endFrequency: 700 },
          { label: 'C', durationSeconds: 0.15 },
        ]},
      ],
    });
    seq.querySelector('.cds-start').click();
    await new Promise((r) => setTimeout(r, 700));
    return seen;
  });
  expect(events).toEqual([
    { frequency: 300, edge: 'start' },
    { frequency: 700, edge: 'end' },
  ]);
});
