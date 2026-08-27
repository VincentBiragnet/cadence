import { test, expect } from '@playwright/test';

// Rewritten onto week and day by KD-15.

test('aria-live announces exactly started/completed, never a continuous update', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const announcements = await page.evaluate(async () => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({
      title: 'Announcing',
      entries: [{ week: 1, day: 1, sequence: { title: 'X', blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.15 }] }] } }],
    });
    const seen = [];
    const observer = new MutationObserver(() => seen.push(prog.querySelector('.cdp-live').textContent));
    observer.observe(prog.querySelector('.cdp-live'), { childList: true, characterData: true, subtree: true });
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
    await new Promise((r) => setTimeout(r, 500));
    observer.disconnect();
    return seen;
  });
  expect(announcements.length).toBe(2);
  expect(announcements[0]).toMatch(/^Started/);
  expect(announcements[1]).toMatch(/^Completed/);
});
