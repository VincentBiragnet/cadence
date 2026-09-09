import { test, expect } from '@playwright/test';

// VC-4 (G-1) — a step carrying a cue shows it under the step label while that
// step runs, at a phone viewport with no scrolling; a step carrying none shows
// no cue at all. KD-4: the cue is the mechanism that reached a reviewer whose
// hands were full, so "on screen" is the claim, not "in the DOM".

test.use({ viewport: { width: 390, height: 844 } });

// Guidance at every scope, deliberately: a fixture carrying only a cue passes
// this criterion while the real page pushes the clock off a phone screen under
// the weight of the cards above it. That is what a screenshot caught and an
// earlier version of this test did not.
const PROGRAM = {
  title: 'Cue test',
  guidance: [{ heading: 'Before you start',
               items: ['Never two days running.', 'Warm up first.',
                       'Stop if a joint hurts rather than a muscle.'] }],
  entries: [{
    week: 1, day: 1, label: 'Cued',
    guidance: [{ heading: 'This session', text: 'Two exercises, seated then standing.' }],
    sequence: {
      title: 'Cued session',
      blocks: [
        { repetitions: 1,
          guidance: [{ heading: 'Form', text: 'Hands under the shoulders, ribs down.' },
                     { heading: 'Watch for', items: ['Hips sagging', 'Elbows flaring'] }],
          steps: [
          { label: 'Push-up', durationSeconds: 0.4, cue: 'Ribs down, elbows back.' },
        ]},
        { repetitions: 1, steps: [{ label: 'Rest', durationSeconds: 20 }] },
      ],
    },
  }],
};

async function run(page, config) {
  await page.goto('/tests/fixture.html');
  return page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
  }, config);
}

test('the cue is on screen under the label while its step runs', async ({ page }) => {
  await run(page, PROGRAM);
  const seen = await page.evaluate(() => {
    const cue = document.querySelector('#prog .cds-cue');
    const label = document.querySelector('#prog .cds-label');
    const clock = document.querySelector('#prog cadence-clock');
    const c = cue.getBoundingClientRect();
    const l = label.getBoundingClientRect();
    const k = clock.getBoundingClientRect();
    return {
      text: cue.textContent,
      visible: cue.checkVisibility(),
      // in the viewport without scrolling
      inView: c.top >= 0 && c.bottom <= window.innerHeight,
      belowLabel: c.top >= l.bottom - 1,
      // VC-1: it belongs to the label, not trailing the runner
      aboveClockBottom: c.top < k.bottom,
      docScrolls: document.documentElement.scrollHeight > window.innerHeight,
    };
  });
  expect(seen.text).toBe('Ribs down, elbows back.');
  expect(seen.visible).toBe(true);
  expect(seen.inView).toBe(true);
  expect(seen.belowLabel).toBe(true);
  expect(seen.aboveClockBottom).toBe(true);
  expect(seen.docScrolls).toBe(false);
});

test('a step with no cue shows none, and the element does not linger', async ({ page }) => {
  await run(page, PROGRAM);
  // Step one is cued; wait it out and land on the uncued rest.
  await page.waitForFunction(
    () => document.querySelector('#prog .cds-label').textContent === 'Rest',
    null, { timeout: 10000 });
  const seen = await page.evaluate(() => {
    const cue = document.querySelector('#prog .cds-cue');
    return { text: cue.textContent, visible: cue.checkVisibility() };
  });
  expect(seen.text).toBe('');
  expect(seen.visible).toBe(false);
});

test('a cue is text, never markup', async ({ page }) => {
  await run(page, {
    title: 'Hostile cue',
    entries: [{ week: 1, day: 1, sequence: { title: 's', blocks: [
      { repetitions: 1, steps: [{ label: 'x', durationSeconds: 20,
        cue: '<img src=x onerror="window.__pwned=1">' }] }] } }],
  });
  const seen = await page.evaluate(() => ({
    text: document.querySelector('#prog .cds-cue').textContent,
    imgs: document.querySelectorAll('#prog .cds-cue img').length,
    pwned: !!window.__pwned,
  }));
  expect(seen.text).toBe('<img src=x onerror="window.__pwned=1">');
  expect(seen.imgs).toBe(0);
  expect(seen.pwned).toBe(false);
});
