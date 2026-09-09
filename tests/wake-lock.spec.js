import { test, expect } from '@playwright/test';

// VC-1 (G-1) — KD-1: held for the whole run, released when it ends by any
// path, never held while only the list is on screen.
//
// KD-9: this grants screen-wake-lock rather than stubbing navigator.wakeLock.
// A real browser asks nobody's permission for a visible page in a secure
// context; headless Chromium's NotAllowedError is an automation policy, not
// the policy a user meets, so granting it restores fidelity. Stubbing the API
// would prove only that the code calls a function the test defined itself.
test.use({ permissions: ['screen-wake-lock'] });

const PROGRAM = {
  title: 'Wake test',
  entries: [{ week: 1, day: 1, label: 'One', sequence: { title: 'One', blocks: [
    { repetitions: 1, steps: [{ label: 'x', durationSeconds: 20 }] }] } }],
};

// The sentinel is private, so observe the real thing: a released sentinel
// reports released === true, and a live one does not.
const state = () => {
  const seq = document.querySelector('cadence-sequence');
  return { want: !!seq._wantWake, has: !!seq._wake, released: seq._wake ? seq._wake.released : null };
};

async function mount(page, config = PROGRAM) {
  await page.goto('/tests/fixture.html');
  await page.evaluate((p) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'prog';
    document.body.appendChild(prog);
    prog.configure(p);
  }, config);
}

test('the permission really is grantable — otherwise this whole file proves nothing', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const real = await page.evaluate(async () => {
    const s = await navigator.wakeLock.request('screen');
    const held = { type: s.type, released: s.released };
    await s.release();
    return { ...held, afterRelease: s.released };
  });
  expect(real).toEqual({ type: 'screen', released: false, afterRelease: true });
});

test('a real lock is held for the run and released on completion', async ({ page }) => {
  await mount(page, { title: 'Short', entries: [{ week: 1, day: 1, sequence: { title: 'S',
    blocks: [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.4 }] }] } }] });

  // Nothing on screen but the list: no lock.
  const before = await page.evaluate(() => !!document.querySelector('cadence-sequence'));
  expect(before).toBe(false);

  await page.evaluate(() => document.querySelector('#prog .cdp-start').click());
  const opened = await page.evaluate(state);
  expect(opened).toEqual({ want: false, has: false, released: null });

  await page.evaluate(() => document.querySelector('#prog cadence-sequence .cds-start').click());
  await page.waitForFunction(() => document.querySelector('cadence-sequence')._wake, null, { timeout: 5000 });
  const running = await page.evaluate(state);
  expect(running).toEqual({ want: true, has: true, released: false });

  const sentinel = await page.evaluateHandle(() => document.querySelector('cadence-sequence')._wake);
  // Completing hands back to the list, which removes the sequence — so wait
  // for the view rather than for an element that is on its way out.
  await page.waitForFunction(
    () => document.querySelector('#prog .cdp-view')?.checkVisibility(),
    null, { timeout: 10000 });
  expect(await sentinel.evaluate((s) => s.released)).toBe(true);
});

test('leaving early releases it', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    document.querySelector('#prog .cdp-start').click();
    document.querySelector('#prog cadence-sequence .cds-start').click();
  });
  await page.waitForFunction(() => document.querySelector('cadence-sequence')._wake, null, { timeout: 5000 });
  const sentinel = await page.evaluateHandle(() => document.querySelector('cadence-sequence')._wake);
  expect(await sentinel.evaluate((s) => s.released)).toBe(false);

  await page.evaluate(() => document.querySelector('#prog .cdp-back').click());
  expect(await sentinel.evaluate((s) => s.released)).toBe(true);
  const gone = await page.evaluate(() => !!document.querySelector('cadence-sequence'));
  expect(gone).toBe(false);
});

test('a lock arriving after the run has ended is let go at once', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const out = await page.evaluate(async () => {
    const seq = document.createElement('cadence-sequence');
    document.body.appendChild(seq);
    seq.configure({ title: 'S', blocks: [
      { repetitions: 1, steps: [{ label: 'x', durationSeconds: 30 }] }] });

    // Hold the request open, start, end the run, then let it resolve.
    const realRequest = navigator.wakeLock.request.bind(navigator.wakeLock);
    let release;
    const gate = new Promise((r) => { release = r; });
    let captured = null;
    navigator.wakeLock.request = async (type) => {
      await gate;
      captured = await realRequest(type);
      return captured;
    };

    seq.querySelector('.cds-start').click();
    seq.remove();               // the run is over before the sentinel arrives
    release();
    await new Promise((r) => setTimeout(r, 200));
    return { captured: !!captured, released: captured ? captured.released : null,
             held: !!seq._wake };
  });
  expect(out.captured).toBe(true);
  expect(out.released).toBe(true);
  expect(out.held).toBe(false);
});
