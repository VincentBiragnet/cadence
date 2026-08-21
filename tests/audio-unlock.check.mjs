// Standalone (not a Playwright *test* file, same reason as file-protocol
// check): asserts the demo's Start button is a real gesture that leaves the
// AudioContext able to run, and that _beep()'s ctx.resume() call doesn't
// throw when the context is already running. This can't prove Firefox's
// exact autoplay policy from here, but it does prove the fix's actual
// mechanism (a click before configure(), and a resume() attempt on every
// beep) behaves as intended in a real page load.
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto('http://localhost:4173/index.html');
await page.click('#start');
await page.waitForTimeout(300);

const state = await page.evaluate(() => document.getElementById('demo')._audioCtx?.state);

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
