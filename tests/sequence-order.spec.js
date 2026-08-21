import { test, expect } from '@playwright/test';

test('steps run in order across block and repetition boundaries', async ({ page }) => {
  await page.goto('/index.html');
  const labels = await page.evaluate(async () => {
    const seq = document.createElement('cadence-sequence');
    document.body.appendChild(seq);
    seq.configure({
      blocks: [
        { repetitions: 2, steps: [{ label: 'A', durationSeconds: 0.1 }, { label: 'B', durationSeconds: 0.1 }] },
        { repetitions: 1, steps: [{ label: 'C', durationSeconds: 0.1 }] },
      ],
    });
    // Observe only from here — configure() already set the first label once
    // (before any run starts), which isn't itself a step transition.
    const seen = [];
    const observer = new MutationObserver(() => seen.push(seq.querySelector('.cds-label').textContent));
    observer.observe(seq.querySelector('.cds-label'), { childList: true, characterData: true, subtree: true });
    seq.querySelector('.cds-start').click();
    await new Promise((r) => setTimeout(r, 700));
    observer.disconnect();
    return seen;
  });
  expect(labels).toEqual(['A', 'B', 'A', 'B', 'C']);
});
