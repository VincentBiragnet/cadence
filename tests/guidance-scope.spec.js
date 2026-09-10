import { test, expect } from '@playwright/test';

// VC-5 (G-2) — program guidance renders on the list view before any session
// starts (KD-2), entry guidance when that session opens (KD-15), and block
// guidance only while its own block runs (KD-6, KD-14): the second exercise's
// card must be absent while the first one is running. That absence is the
// whole point — stacking both cards is what put Start 1833px down the page.

const BLOCK_A = [{ heading: 'Seated', text: 'Knees at ninety, sole on the floor.' }];
const BLOCK_B = [{ heading: 'Single leg', text: 'Hand on the wall for balance only.' }];

const PROGRAM = {
  title: 'Scope test',
  guidance: [{ heading: 'Before you start', items: ['Never two days running.'] }],
  entries: [{
    week: 1, day: 1, label: 'Two exercises',
    guidance: [{ heading: 'This session', text: 'Two exercises, seated then single leg.' }],
    sequence: {
      title: 'Session',
      blocks: [
        { repetitions: 1, guidance: BLOCK_A, steps: [{ label: 'Seated', durationSeconds: 0.4 }] },
        { repetitions: 1, guidance: BLOCK_B, steps: [{ label: 'Single leg', durationSeconds: 20 }] },
      ],
    },
  }],
};

const text = () => document.getElementById('prog').innerText;

test('each scope shows when it begins, and not before', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog._showList(true);   // programme guidance lives under the list now
  }, PROGRAM);

  // On the list: the program's own guidance, and nothing narrower.
  const onList = await page.evaluate(() => {
    const el = document.querySelector('#prog .cdp-program-guidance');
    return { visible: el.checkVisibility(), text: el.textContent,
             page: document.getElementById('prog').textContent };
  });
  expect(onList.visible).toBe(true);
  expect(onList.text).toContain('Never two days running.');
  expect(onList.page).not.toContain('Knees at ninety');
  expect(onList.page).not.toContain('Hand on the wall');

  // Opening the session adds the entry's guidance — still no block cards.
  await page.evaluate(() => document.querySelector('#prog .cdp-start').click());
  const onOpen = await page.evaluate(() => {
    const el = document.querySelector('#prog .cdp-entry-guidance');
    return { visible: el.checkVisibility(), text: el.textContent,
             page: document.getElementById('prog').textContent };
  });
  expect(onOpen.visible).toBe(true);
  expect(onOpen.text).toContain('seated then single leg');
  // The cursor sits on block one before Start, exactly as the step label and
  // position already do, so its card is current and shows. What must not be
  // here is the block that has not been reached.
  expect(onOpen.page).toContain('Knees at ninety');
  expect(onOpen.page).not.toContain('Hand on the wall');

  // First block running: its card, and only its card.
  await page.evaluate(() => document.querySelector('#prog cadence-sequence .cds-start').click());
  const first = await page.evaluate(() => document.getElementById('prog').textContent);
  expect(first).toContain('Knees at ninety');
  expect(first).not.toContain('Hand on the wall');

  // Second block: the swap, both ways.
  await page.waitForFunction(
    () => document.querySelector('#prog .cds-label').textContent === 'Single leg',
    null, { timeout: 10000 });
  const second = await page.evaluate(() => document.getElementById('prog').textContent);
  expect(second).toContain('Hand on the wall');
  expect(second).not.toContain('Knees at ninety');
});

test('block guidance stays up for every repetition of its block', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate((g) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure({ title: 'Reps', entries: [{ week: 1, day: 1, sequence: { title: 's', blocks: [
      { repetitions: 4, guidance: g, steps: [{ label: 'Up', durationSeconds: 0.3 }] }] } }] });
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
  }, BLOCK_A);

  const seen = [];
  for (let i = 0; i < 4; i += 1) {
    seen.push(await page.evaluate(() => ({
      rep: document.querySelector('#prog .cds-position').textContent,
      shown: document.querySelector('#prog .cds-guidance').checkVisibility(),
    })));
    await page.waitForTimeout(300);
  }
  // Every sample, whichever repetition it landed on, has the card up.
  expect(seen.every((s) => s.shown)).toBe(true);
  expect(new Set(seen.map((s) => s.rep)).size).toBeGreaterThan(1);
});

test('guidance of the wrong shape is ignored, not refused', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const out = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    try {
      prog.configure({ title: 'Wrong shape', guidance: 'just a string',
        entries: [{ week: 1, day: 1, guidance: [null, {}, { heading: 'Kept', text: 'yes' }],
          sequence: { title: 's', blocks: [{ repetitions: 1,
            steps: [{ label: 'x', durationSeconds: 20 }] }] } }] });
    } catch (e) { return { threw: e.message }; }
    prog.querySelector('.cdp-start').click();
    return {
      threw: null,
      programShown: document.querySelector('#prog .cdp-program-guidance').checkVisibility(),
      entryText: document.querySelector('#prog .cdp-entry-guidance').textContent,
      runs: !!document.querySelector('#prog cadence-sequence'),
    };
  });
  expect(out.threw).toBe(null);
  expect(out.programShown).toBe(false);   // a string is not a list of blocks
  expect(out.entryText).toContain('Kept'); // the empty entries drop out, the real one stays
  expect(out.runs).toBe(true);
});

test('guidance is text, never markup', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const out = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure({ title: 'Hostile',
      guidance: [{ heading: '<b>bold</b>', items: ['<img src=x onerror="window.__pwned=1">'] }],
      entries: [{ week: 1, day: 1, sequence: { title: 's', blocks: [
        { repetitions: 1, steps: [{ label: 'x', durationSeconds: 20 }] }] } }] });
    const el = document.querySelector('#prog .cdp-program-guidance');
    return { text: el.textContent, tags: el.querySelectorAll('b, img').length, pwned: !!window.__pwned };
  });
  expect(out.text).toContain('<b>bold</b>');
  expect(out.tags).toBe(0);
  expect(out.pwned).toBe(false);
});
