// Standalone (not a Playwright *test* file, same reason as file-protocol
// check): asserts a session's own Start button is a real gesture that leaves
// the AudioContext able to run, and that _beep()'s ctx.resume() call doesn't
// throw when the context is already running. This can't prove Firefox's
// exact autoplay policy from here, but it does prove the fix's actual
// mechanism (a click before configure(), and a resume() attempt on every
// beep) behaves as intended in a real page load.
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// KD-3, KD-8: the gesture under test is now a session's own Start, which is
// the one a real user makes — the demonstration button was only ever standing
// in for it because that is what the page had.
page.on('dialog', (d) => d.accept());
await page.goto('http://localhost:4173/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => {
  const prog = document.getElementById('program');
  prog.configure({ title: 'Audio unlock check', entries: [{ week: 1, day: 1,
    sequence: { title: 'One', blocks: [{ repetitions: 1, steps: [
      { label: 'Step', durationSeconds: 20, startFrequency: 440 }] }] } }] });
  prog.hidden = false;
  prog.querySelector('.cdp-start').click();
});
// The real gesture: a click, not a dispatched event.
await page.click('#program cadence-sequence .cds-start');
await page.waitForTimeout(300);

const state = await page.evaluate(
  () => document.querySelector('#program cadence-clock')._audioCtx?.state);

await browser.close();

if (errors.length > 0) {
  console.error('page errors:', errors);
  process.exit(1);
}
if (state !== 'running') {
  console.error(`expected the AudioContext to be running after Start is clicked, got ${JSON.stringify(state)}`);
  process.exit(1);
}
console.log(`ok: AudioContext state after Start click + first beep: ${state}`);
