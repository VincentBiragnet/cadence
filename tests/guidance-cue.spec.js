import { test, expect } from '@playwright/test';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

// The shape that failed VC-1 on the first attempt: the criterion passed on a
// fixture and on the contract example, and broke on the real page at five
// bullets of block guidance, because focusing Start scrolled the label and the
// cue off the top of a ~4000px page. It is the *main page* and the *amount of
// guidance* that matter, so this exercises both.
function heavy(bullets) {
  return {
    title: 'Heavy guidance',
    guidance: [{ heading: 'Before you start', text: 'Three sessions a week, never two days running.' }],
    entries: [{
      week: 1, day: 1, label: 'Heavy',
      guidance: [{ heading: 'This session', text: 'Two rounds. Keep the rest honest.' }],
      sequence: { title: 'Heavy session', blocks: [{
        repetitions: 1,
        guidance: [
          { heading: 'Form', text: 'Hands under the shoulders, ribs down.' },
          { heading: 'Watch for',
            items: Array.from({ length: bullets },
              (_, i) => `Point ${i + 1}: keep the ribs down and the hips level.`) },
        ],
        steps: [{ label: 'Push-up', durationSeconds: 60,
                  cue: 'Ribs down, elbows back — stop before the hips sag.' }],
      }] },
    }],
  };
}

for (const bullets of [4, 6, 20]) {
  test(`the cue survives ${bullets} bullets of block guidance on the real page`, async ({ page }) => {
    await page.goto('/index.html');
    // Load it the way a person does. Calling configure() directly leaves
    // #program hidden — the page only reveals it on cadence:programLoaded —
    // and every rect on a hidden element is 0x0 at 0,0, which satisfies an
    // "is it in the viewport" check without anything being on screen.
    const dir = mkdtempSync(join(tmpdir(), 'cadence-'));
    const file = join(dir, 'heavy.json');
    writeFileSync(file, JSON.stringify(heavy(bullets)));
    await page.setInputFiles('#program .cdp-load', file);
    await page.evaluate(() => {
      const prog = document.getElementById('program');
      prog.querySelector('.cdp-start').click();
      prog.querySelector('cadence-sequence .cds-start').click();
    });
    await page.waitForTimeout(600);

    const seen = await page.evaluate(() => {
      const cue = document.querySelector('#program .cds-cue');
      const label = document.querySelector('#program .cds-label');
      const c = cue.getBoundingClientRect();
      const l = label.getBoundingClientRect();
      return {
        text: cue.textContent,
        cueTop: Math.round(c.top), cueBottom: Math.round(c.bottom),
        labelTop: Math.round(l.top),
        visible: cue.checkVisibility(),
        area: Math.round(c.width * c.height),
        inView: c.top >= 0 && c.bottom <= window.innerHeight,
        labelInView: l.top >= 0,
        scrollY: Math.round(window.scrollY),
      };
    });
    expect(seen.text).toContain('Ribs down');
    // A hidden element is 0x0 at 0,0 and passes an in-viewport check for free.
    expect(seen.visible).toBe(true);
    expect(seen.area).toBeGreaterThan(1000);
    // The whole point of a cue: on screen while the step runs, not scrolled past.
    expect(seen.inView, `cue at ${seen.cueTop}..${seen.cueBottom}, scrollY ${seen.scrollY}`).toBe(true);
    expect(seen.labelInView, `label at ${seen.labelTop}`).toBe(true);
  });
}
