import { test, expect } from '@playwright/test';

test('a visual pulse fires with every beep, aria-live announces only on change', async ({ page }) => {
  await page.goto('/parts.html');
  const result = await page.evaluate(async () => {
    const seq = document.createElement('cadence-sequence');
    document.body.appendChild(seq);
    let pulses = 0;
    const pulseObserver = new MutationObserver(() => { if (seq.hasAttribute('data-pulse')) pulses += 1; });
    pulseObserver.observe(seq, { attributes: true, attributeFilter: ['data-pulse'] });

    const announcements = [];
    const liveObserver = new MutationObserver(() => announcements.push(seq.querySelector('.cds-live').textContent));
    liveObserver.observe(seq.querySelector('.cds-live'), { childList: true, characterData: true, subtree: true });

    seq.configure({
      blocks: [{ repetitions: 1, steps: [
        { label: 'A', durationSeconds: 0.15, startFrequency: 300, endFrequency: 400 },
        { label: 'B', durationSeconds: 0.15 },
      ]}],
    });
    seq.querySelector('.cds-start').click();
    await new Promise((r) => setTimeout(r, 500));
    pulseObserver.disconnect();
    liveObserver.disconnect();
    return { pulses, announcements, hiddenIsAriaHidden: seq.querySelector('[aria-hidden="true"]') !== null };
  });
  expect(result.pulses).toBeGreaterThanOrEqual(2); // start + end beep on step A
  // One announcement per step (2) plus the final "Complete" — never one per
  // tick, which is the claim. The screen-stays-awake notice is a fourth, said
  // once at the start when the browser refuses a wake lock (it always does
  // under automation), so it is named rather than allowed to inflate a count
  // that is supposed to catch spam.
  const wake = result.announcements.filter((t) => /screen may sleep/.test(t));
  const work = result.announcements.filter((t) => !/screen may sleep/.test(t));
  expect(wake.length).toBeLessThanOrEqual(1);
  expect(work.length).toBe(3);
  expect(work[work.length - 1]).toBe('Complete');
  expect(result.hiddenIsAriaHidden).toBe(true);
});
