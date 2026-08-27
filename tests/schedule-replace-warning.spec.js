import { test, expect } from '@playwright/test';

// VC-7 — only one program is part-run at a time, so taking on another one
// replaces it, and says so first (KD-11).

const step = (label) => ({ repetitions: 1, steps: [{ label, durationSeconds: 0.2 }] });
const make = (title) => ({
  title,
  entries: [{ week: 1, day: 1, sequence: { title: `${title} session`, blocks: [step('a')] } }],
});

async function startPartRun(page, program) {
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelector('.cdp-start').click(); // anchors it: now part-run
    prog.querySelector('.cdp-back').click();
  }, program);
}

test('declining the warning leaves the part-run program in place, in the element and in storage', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await startPartRun(page, make('First program'));

  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });

  const result = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    return {
      shown: prog.config.title,
      stored: JSON.parse(localStorage.getItem('cadence-program')).title,
      anchored: Boolean(prog.config.anchorDate),
    };
  }, make('Second program'));

  expect(dialogs).toHaveLength(1);
  expect(dialogs[0]).toContain('Second program');
  expect(dialogs[0]).toContain('First program');
  expect(result.shown).toBe('First program');
  expect(result.stored).toBe('First program');
  expect(result.anchored).toBe(true);
});

test('accepting the warning replaces it', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await startPartRun(page, make('First program'));

  page.on('dialog', (d) => d.accept());

  const result = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    return {
      shown: prog.config.title,
      stored: JSON.parse(localStorage.getItem('cadence-program')).title,
      anchored: Boolean(prog.config.anchorDate),
    };
  }, make('Second program'));

  expect(result.shown).toBe('Second program');
  expect(result.stored).toBe('Second program');
  expect(result.anchored).toBe(false);
});

test('a program that is merely loaded, never run, is replaced without a warning', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p); // configured but never launched: nothing to lose
  }, make('First program'));

  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });

  const shown = await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure(p);
    return prog.config.title;
  }, make('Second program'));

  expect(dialogs).toHaveLength(0);
  expect(shown).toBe('Second program');
});
