import { test, expect } from '@playwright/test';

// VC-1 (G-1) — a program declares what to record (KD-1); two kinds only,
// number and text, with a nought-to-ten scale being a number with min and max
// (KD-2); blank is a real answer and stores nothing (KD-3); a number stores a
// number, never the string the input hands over (KD-10).

const RECORD = [
  { name: 'loadB', label: 'Load, seated', kind: 'number', unit: 'kg' },
  { name: 'pain', label: 'Pain during', kind: 'number', min: 0, max: 10 },
  { name: 'notes', label: 'Notes', kind: 'text' },
];

function program(record = RECORD) {
  return {
    title: 'Record test',
    record,
    entries: [
      { week: 1, day: 1, label: 'One', sequence: { title: 'One', blocks: [
        { repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.3 }] }] } },
      { week: 1, day: 3, label: 'Two', sequence: { title: 'Two', blocks: [
        { repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.3 }] }] } },
    ],
  };
}

async function runFirst(page, config) {
  await page.goto('/tests/fixture.html');
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
  }, config);
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-record')?.checkVisibility(),
    null, { timeout: 10000 });
}

test('all three declared fields appear when the session completes', async ({ page }) => {
  await runFirst(page, program());
  const form = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('#prog .cdp-record-input')];
    return inputs.map((i) => ({
      name: i.dataset.name, type: i.type, min: i.min, max: i.max,
      label: document.querySelector(`label[for="${i.id}"]`).textContent,
      visible: i.checkVisibility(),
    }));
  });
  expect(form).toEqual([
    { name: 'loadB', type: 'number', min: '', max: '', label: 'Load, seated (kg)', visible: true },
    { name: 'pain', type: 'number', min: '0', max: '10', label: 'Pain during', visible: true },
    { name: 'notes', type: 'text', min: '', max: '', label: 'Notes', visible: true },
  ]);
});

test('what is typed is stored, numbers as numbers, blanks not at all', async ({ page }) => {
  await runFirst(page, program());
  await page.fill('#prog input[data-name="loadB"]', '42.5');
  await page.fill('#prog input[data-name="notes"]', 'felt heavy');
  // pain deliberately left blank
  await page.click('#prog .cdp-record-save');

  const stored = await page.evaluate(() => {
    const e = document.getElementById('prog').config.entries[0];
    return { recorded: e.recorded, types: Object.fromEntries(
      Object.entries(e.recorded).map(([k, v]) => [k, typeof v])) };
  });
  expect(stored.recorded).toEqual({ loadB: 42.5, notes: 'felt heavy' });
  expect(stored.types).toEqual({ loadB: 'number', notes: 'string' });
  expect('pain' in stored.recorded).toBe(false);
});

test('skipping records nothing and still returns to the list', async ({ page }) => {
  await runFirst(page, program());
  await page.click('#prog .cdp-record-skip');
  const after = await page.evaluate(() => {
    const prog = document.getElementById('prog');
    const e = prog.config.entries[0];
    return {
      recorded: e.recorded === undefined,
      completed: !!e.actualDate,
      onList: prog.querySelector('.cdp-view').checkVisibility(),
      formGone: !prog.querySelector('.cdp-record').checkVisibility(),
    };
  });
  expect(after).toEqual({ recorded: true, completed: true, onList: true, formGone: true });
});

test('completion is recorded before the form, so it cannot be lost', async ({ page }) => {
  await runFirst(page, program());
  // The form is open and nothing has been saved — the session is already done.
  const mid = await page.evaluate(() => {
    const e = document.getElementById('prog').config.entries[0];
    return { actualDate: e.actualDate, stored: JSON.parse(
      localStorage.getItem(Object.keys(localStorage).find((k) => k.includes('cadence'))
        || '') || '{}') };
  });
  expect(mid.actualDate).toBeTruthy();
  expect(mid.stored.entries[0].actualDate).toBe(mid.actualDate);
});

test('a program declaring nothing goes straight back to the list', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
  }, program(null));
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-view')?.checkVisibility(),
    null, { timeout: 10000 });
  const after = await page.evaluate(() => ({
    form: document.querySelector('#prog .cdp-record').checkVisibility(),
    done: !!document.getElementById('prog').config.entries[0].actualDate,
  }));
  expect(after).toEqual({ form: false, done: true });
});

test('a malformed record declaration is ignored, not refused', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const out = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    try {
      prog.configure({ title: 'Bad', record: [null, {}, 'nope', { name: 'ok', kind: 'wat' }],
        entries: [{ week: 1, day: 1, sequence: { title: 's', blocks: [
          { repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.3 }] }] } }] });
    } catch (e) { return { threw: e.message }; }
    prog.querySelector('.cdp-start').click();
    return { threw: null, runs: !!prog.querySelector('cadence-sequence') };
  });
  expect(out.threw).toBe(null);
  expect(out.runs).toBe(true);
  await page.evaluate(() => document.querySelector('#prog cadence-sequence .cds-start').click());
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-record')?.checkVisibility(),
    null, { timeout: 10000 });
  // Only the one usable declaration survives, defaulted to a number.
  const fields = await page.evaluate(() => [...document.querySelectorAll('#prog .cdp-record-input')]
    .map((i) => ({ name: i.dataset.name, type: i.type })));
  expect(fields).toEqual([{ name: 'ok', type: 'number' }]);
});

// Found on review, all three reachable by an ordinary user re-running a
// session they have already recorded.

test('re-running a recorded session prefills it, so saving cannot drop a field', async ({ page }) => {
  await runFirst(page, program());
  await page.fill('#prog input[data-name="loadB"]', '40');
  await page.fill('#prog input[data-name="notes"]', 'first note');
  await page.click('#prog .cdp-record-save');
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-view')?.checkVisibility(), null, { timeout: 10000 });

  // Do it again. The form should show what is already there.
  await page.evaluate(() => {
    const prog = document.getElementById('prog');
    prog._select(0, true);
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
  });
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-record')?.checkVisibility(), null, { timeout: 10000 });
  const prefilled = await page.evaluate(() => Object.fromEntries(
    [...document.querySelectorAll('#prog .cdp-record-input')].map((i) => [i.dataset.name, i.value])));
  expect(prefilled).toEqual({ loadB: '40', pain: '', notes: 'first note' });

  // Change only the load; the note is on screen, so it survives.
  await page.fill('#prog input[data-name="loadB"]', '50');
  await page.click('#prog .cdp-record-save');
  const after = await page.evaluate(() => document.getElementById('prog').config.entries[0].recorded);
  expect(after).toEqual({ loadB: 50, notes: 'first note' });
});

test('clearing every field clears the record, rather than keeping what was deleted', async ({ page }) => {
  await runFirst(page, program());
  await page.fill('#prog input[data-name="loadB"]', '40');
  await page.click('#prog .cdp-record-save');
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-view')?.checkVisibility(), null, { timeout: 10000 });

  await page.evaluate(() => {
    const prog = document.getElementById('prog');
    prog._select(0, true);
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
  });
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-record')?.checkVisibility(), null, { timeout: 10000 });
  await page.fill('#prog input[data-name="loadB"]', '');
  await page.click('#prog .cdp-record-save');
  const after = await page.evaluate(() => {
    const e = document.getElementById('prog').config.entries[0];
    return { hasRecorded: 'recorded' in e, stillDone: !!e.actualDate };
  });
  expect(after).toEqual({ hasRecorded: false, stillDone: true });
});

test('a repeated field name is declared once, not twice with one id', async ({ page }) => {
  await runFirst(page, program([
    { name: 'dup', label: 'First', kind: 'number' },
    { name: 'dup', label: 'Second', kind: 'text' },
    { name: 'other', label: 'Other', kind: 'text' },
  ]));
  const out = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('#prog .cdp-record-input')];
    const ids = inputs.map((i) => i.id);
    return {
      names: inputs.map((i) => i.dataset.name),
      types: inputs.map((i) => i.type),
      uniqueIds: new Set(ids).size === ids.length,
      labelsResolve: [...document.querySelectorAll('#prog .cdp-record-label')]
        .every((l) => document.getElementById(l.htmlFor)),
    };
  });
  expect(out.names).toEqual(['dup', 'other']);
  expect(out.types).toEqual(['number', 'text']);
  expect(out.uniqueIds).toBe(true);
  expect(out.labelsResolve).toBe(true);
});

test('a long recorded note does not push the page sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await runFirst(page, program());
  await page.fill('#prog input[data-name="notes"]', 'x'.repeat(800));
  await page.click('#prog .cdp-record-save');
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-view')?.checkVisibility(), null, { timeout: 10000 });
  await page.evaluate(() => {
    const prog = document.getElementById('prog');
    prog._select(1, true);
    prog.querySelector('.cdp-start').click();
  });
  const width = await page.evaluate(() => ({
    body: document.body.scrollWidth, inner: window.innerWidth,
    shown: document.querySelector('#prog .cdp-lasttime').checkVisibility(),
  }));
  expect(width.shown).toBe(true);
  expect(width.body, `body ${width.body} vs viewport ${width.inner}`).toBeLessThanOrEqual(width.inner);
});
