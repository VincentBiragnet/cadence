import { test, expect } from '@playwright/test';

// VC-2 (G-2) — KD-4: last time's values appear twice, because they answer at
// different moments. When the session opens they change what you load; beside
// each field they are what you compare against. KD-8: "last time" is the most
// recently dated session actually recorded, not the row above, because
// sessions may be done out of order.

const RECORD = [
  { name: 'loadB', label: 'Load, seated', kind: 'number', unit: 'kg' },
  { name: 'pain', label: 'Pain during', kind: 'number', min: 0, max: 10 },
];

const PROGRAM = {
  title: 'Carryover',
  record: RECORD,
  entries: [1, 3, 5].map((day, i) => ({
    week: 1, day, label: `S${i + 1}`,
    sequence: { title: `S${i + 1}`, blocks: [
      { repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.3 }] }] },
  })),
};

async function mount(page, config) {
  await page.goto('/tests/fixture.html');
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
  }, config);
}

async function doSession(page, index, values) {
  await page.evaluate((i) => {
    const prog = document.getElementById('prog');
    prog._select(i, true);
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
  }, index);
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-record')?.checkVisibility(),
    null, { timeout: 10000 });
  for (const [name, v] of Object.entries(values)) {
    await page.fill(`#prog input[data-name="${name}"]`, String(v));
  }
  await page.click('#prog .cdp-record-save');
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-view')?.checkVisibility(),
    null, { timeout: 10000 });
}

async function openSession(page, index) {
  await page.evaluate((i) => {
    const prog = document.getElementById('prog');
    prog._select(i, true);
    prog.querySelector('.cdp-start').click();
  }, index);
  return page.evaluate(() => {
    const el = document.querySelector('#prog .cdp-lasttime');
    return { text: el.textContent, visible: el.checkVisibility() };
  });
}

test('with nothing recorded yet, neither place shows anything', async ({ page }) => {
  await mount(page, PROGRAM);
  const opened = await openSession(page, 0);
  expect(opened.visible).toBe(false);
  expect(opened.text).toBe('');

  await page.evaluate(() => document.querySelector('#prog cadence-sequence .cds-start').click());
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-record')?.checkVisibility(),
    null, { timeout: 10000 });
  const hints = await page.evaluate(
    () => document.querySelectorAll('#prog .cdp-record-last').length);
  expect(hints).toBe(0);
});

test('the next session shows last time, on opening and beside each field', async ({ page }) => {
  await mount(page, PROGRAM);
  await doSession(page, 0, { loadB: 40, pain: 4 });

  const opened = await openSession(page, 1);
  expect(opened.visible).toBe(true);
  expect(opened.text).toContain('Load, seated 40 kg');
  expect(opened.text).toContain('Pain during 4');

  await page.evaluate(() => document.querySelector('#prog cadence-sequence .cds-start').click());
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-record')?.checkVisibility(),
    null, { timeout: 10000 });
  const hints = await page.evaluate(() => [...document.querySelectorAll('#prog .cdp-record-field')]
    .map((f) => ({ name: f.querySelector('input').dataset.name,
                   hint: (f.querySelector('.cdp-record-last') || {}).textContent || null })));
  expect(hints).toEqual([
    { name: 'loadB', hint: 'last time 40 kg' },
    { name: 'pain', hint: 'last time 4' },
  ]);
});

test('last time means the most recently dated, not the row above', async ({ page }) => {
  await mount(page, PROGRAM);
  await doSession(page, 2, { loadB: 55, pain: 6 });
  await doSession(page, 0, { loadB: 30, pain: 2 });
  // Both landed today, so back-date the one that was really earlier. This is
  // the case KD-8 is about: done out of order, days apart.
  await page.evaluate(() => {
    document.getElementById('prog').config.entries[2].actualDate = '2026-01-05';
  });

  const opened = await openSession(page, 1);
  expect(opened.text).toContain('Load, seated 30 kg');
  expect(opened.text).not.toContain('55');
});

test('two sessions on one day fall back to list order, which is what AM then PM wants',
  async ({ page }) => {
    await mount(page, PROGRAM);
    // Recorded in list order on the same day: the later row is the later
    // session, so it is the one carried forward. Note the limit this exposes —
    // done *out* of order on the same day, the date cannot separate them and
    // list order is all there is.
    await doSession(page, 0, { loadB: 30, pain: 2 });
    await doSession(page, 1, { loadB: 35, pain: 3 });
    const opened = await openSession(page, 2);
    expect(opened.text).toContain('Load, seated 35 kg');
  });

test('a skipped session does not become last time', async ({ page }) => {
  await mount(page, PROGRAM);
  await doSession(page, 0, { loadB: 40, pain: 4 });
  // Second session: complete it but record nothing.
  await page.evaluate(() => {
    const prog = document.getElementById('prog');
    prog._select(1, true);
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
  });
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-record')?.checkVisibility(),
    null, { timeout: 10000 });
  await page.click('#prog .cdp-record-skip');

  const opened = await openSession(page, 2);
  expect(opened.visible).toBe(true);
  expect(opened.text).toContain('Load, seated 40 kg');
});
