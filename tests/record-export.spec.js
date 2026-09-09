import { test, expect } from '@playwright/test';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// VC-3 (G-3) — KD-5. What was measured has to leave with the file, or the
// model asked to replan can only reshuffle the calendar. The values ride in
// the embedded JSON; the work is naming them where a model reads the standing
// list, and telling it to carry them through.

const PROGRAM = {
  title: 'Export test',
  record: [
    { name: 'loadB', label: 'Load, seated', kind: 'number', unit: 'kg' },
    { name: 'pain', label: 'Pain during', kind: 'number', min: 0, max: 10 },
  ],
  entries: [1, 3].map((day, i) => ({
    week: 1, day, label: `S${i + 1}`,
    sequence: { title: `S${i + 1}`, blocks: [
      { repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.3 }] }] },
  })),
};

async function mountAndRecord(page) {
  await page.goto('/tests/fixture.html');
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
    prog.querySelector('.cdp-start').click();
    prog.querySelector('cadence-sequence .cds-start').click();
  }, PROGRAM);
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-record')?.checkVisibility(),
    null, { timeout: 10000 });
  await page.fill('#prog input[data-name="loadB"]', '42.5');
  await page.fill('#prog input[data-name="pain"]', '4');
  await page.click('#prog .cdp-record-save');
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-view')?.checkVisibility(),
    null, { timeout: 10000 });
}

test('recorded values survive a page reload', async ({ page }) => {
  await mountAndRecord(page);
  await page.reload();
  const restored = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.restore();
    return prog.config.entries[0].recorded;
  });
  expect(restored).toEqual({ loadB: 42.5, pain: 4 });
});

test('recorded values survive an export and a load back', async ({ page }) => {
  await mountAndRecord(page);
  const exported = await page.evaluate(() => JSON.stringify(document.getElementById('prog').config));
  const doc = JSON.parse(exported);
  expect(doc.entries[0].recorded).toEqual({ loadB: 42.5, pain: 4 });
  expect(doc.record.map((f) => f.name)).toEqual(['loadB', 'pain']);

  const dir = mkdtempSync(join(tmpdir(), 'cadence-'));
  const file = join(dir, 'back.json');
  writeFileSync(file, exported);

  page.on('dialog', (d) => d.accept());
  await page.goto('/index.html');
  await page.setInputFiles('#program .cdp-load', file);
  const back = await page.evaluate(
    () => document.getElementById('program').config.entries[0].recorded);
  expect(back).toEqual({ loadB: 42.5, pain: 4 });
  expect(typeof back.loadB).toBe('number');
});

test('the replanning prompt names the values and says to carry them', async ({ page }) => {
  await mountAndRecord(page);
  const prompt = await page.evaluate(() => {
    let captured = null;
    const prog = document.getElementById('prog');
    prog._download = (text) => { captured = text; };
    prog._exportReplanningPrompt();
    return captured;
  });

  // Named in the human-readable standing list, on the done session only.
  const lines = prompt.split('\n').filter((l) => /^\d+\. week/.test(l));
  expect(lines[0]).toContain('recorded Load, seated 42.5 kg, Pain during 4');
  expect(lines[1]).not.toContain('recorded');
  // Carried in the embedded JSON.
  expect(prompt).toContain('"loadB": 42.5');
  // And the model is told not to touch it.
  expect(prompt).toMatch(/carry .*`recorded`.* through unchanged|`recorded`/);
  expect(prompt).toContain('must never be invented, altered or dropped');
});

test('a program with no record declaration produces the prompt it always did', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const prompt = await page.evaluate(() => {
    const prog = document.createElement('cadence-program');
    document.body.appendChild(prog);
    prog.configure({ title: 'Plain', entries: [{ week: 1, day: 1, sequence: { title: 's',
      blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.3 }] }] } }] });
    let captured = null;
    prog._download = (text) => { captured = text; };
    prog._exportReplanningPrompt();
    return captured;
  });
  const lines = prompt.split('\n').filter((l) => /^\d+\. week/.test(l));
  expect(lines[0]).not.toContain('recorded');
});
