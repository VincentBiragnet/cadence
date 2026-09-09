// Not a Playwright *test* file (playwright.config.js's webServer serves over
// http, and this is specifically about the file:// case), so it's a standalone
// script. Exit 0/1 for `verify --run`.
//
// KD-3 of the page spec: it used to drive the demonstration clock, because
// that is what index.html happened to have on it. Now it drives the real
// thing — load a programme from disk, open a session, run a step — which is
// what a person double-clicking the file actually does, and a stronger claim.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const url = `file://${join(root, 'index.html')}`;

const PROGRAM = {
  title: 'File protocol check',
  guidance: [{ heading: 'Before you start', text: 'Loaded straight off the disk.' }],
  entries: [{
    week: 1, day: 1, label: 'One',
    sequence: { title: 'One', blocks: [{
      repetitions: 1,
      guidance: [{ heading: 'Form',
                   svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>' }],
      steps: [{ label: 'Step', durationSeconds: 20, cue: 'A cue, read while moving.' }],
    }] },
  }],
};
const file = join(mkdtempSync(join(tmpdir(), 'cadence-')), 'program.json');
writeFileSync(file, JSON.stringify(PROGRAM));

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('dialog', (d) => d.accept());

await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.setInputFiles('#program .cdp-load', file);
await page.evaluate(() => {
  const prog = document.getElementById('program');
  prog.querySelector('.cdp-start').click();
  prog.querySelector('cadence-sequence .cds-start').click();
});
await page.waitForTimeout(300);

const seen = await page.evaluate(() => ({
  time: document.querySelector('#program cadence-clock .cdc-time')?.textContent ?? null,
  cue: document.querySelector('#program .cds-cue')?.textContent ?? null,
  figure: !!document.querySelector('#program .cds-guidance svg'),
  rows: document.querySelectorAll('#program .cdp-row').length,
}));
await browser.close();

const problems = [];
if (errors.length) problems.push(`console/page errors: ${errors.join(' | ')}`);
if (seen.rows !== 1) problems.push(`expected the programme to load, saw ${seen.rows} rows`);
if (!/^0:1\d$|^0:20$/.test(seen.time ?? '')) problems.push(`step clock reads ${JSON.stringify(seen.time)}`);
if (seen.cue !== 'A cue, read while moving.') problems.push(`cue reads ${JSON.stringify(seen.cue)}`);
if (!seen.figure) problems.push('the rebuilt drawing did not render');

if (problems.length) {
  console.error('via file://:', problems.join('; '));
  process.exit(1);
}
console.log(`ok: over file://, a programme loads, a session runs (${seen.time}), the cue and the drawing both render`);
