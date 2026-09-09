import { test, expect } from '@playwright/test';

// VC-6 (G-3) — the contract is the only thing a model reads, so it has to
// name the fields with their scopes, and it must not claim something the code
// does not do (KD-10: unrecognised fields are kept and shown nowhere, never
// rejected). The page's own example is the honesty check: it is what a model
// copies, so everything it demonstrates has to actually render.

test('the contract names cue and guidance, with their scopes', async ({ page }) => {
  await page.goto('/index.html');
  const contract = await page.evaluate(
    () => document.getElementById('format').textContent.replace(/\s+/g, ' '));

  expect(contract).toContain('cue');
  expect(contract).toContain('guidance');
  // The three scopes guidance is allowed at (KD-5).
  expect(contract).toMatch(/on the program, on an entry and on a block/);
  // The shape (KD-13).
  expect(contract).toContain('heading');
  expect(contract).toContain('items');
  // When each one shows (KD-6, KD-15).
  expect(contract).toMatch(/block guidance for as long as that block runs/);
});

test('the contract no longer claims unrecognised fields are rejected', async ({ page }) => {
  await page.goto('/index.html');
  const contract = await page.evaluate(
    () => document.getElementById('format').textContent.replace(/\s+/g, ' '));
  expect(contract).not.toMatch(/anything not described here is rejected/i);
  // And says what actually happens instead, so a one-shot reader is not
  // left believing a clean load proves a correct file.
  expect(contract).toMatch(/does not recognise/);
});

test("the page's own example carries a cue and guidance, and both render", async ({ page }) => {
  await page.goto('/index.html');
  const example = await page.evaluate(
    () => JSON.parse(document.getElementById('contract-example').textContent));

  // It demonstrates what the prose describes.
  expect(Array.isArray(example.guidance)).toBe(true);
  expect(Array.isArray(example.entries[0].guidance)).toBe(true);
  expect(Array.isArray(example.entries[0].sequence.blocks[0].guidance)).toBe(true);
  expect(typeof example.entries[0].sequence.blocks[0].steps[0].cue).toBe('string');

  // And configuring it actually puts all four on screen.
  const rendered = await page.evaluate((doc) => {
    const prog = document.createElement('cadence-program');
    prog.id = 'probe';
    document.body.appendChild(prog);
    prog.configure(doc);
    const program = prog.querySelector('.cdp-program-guidance').textContent;
    prog.querySelector('.cdp-start').click();
    const entry = prog.querySelector('.cdp-entry-guidance').textContent;
    const seq = prog.querySelector('cadence-sequence');
    return { program, entry,
             block: seq.querySelector('.cds-guidance').textContent,
             cue: seq.querySelector('.cds-cue').textContent };
  }, example);

  expect(rendered.program).toContain('never two days running');
  expect(rendered.entry).toContain('Two rounds');
  expect(rendered.block).toContain('Hands under the shoulders');
  expect(rendered.cue).toContain('Ribs down');
});

// KD-3: the shipped example lives on the developer page now, not on the app.
test('the shipped example carries them too, so Try shows the real thing', async ({ page }) => {
  await page.goto('/parts.html');
  await page.click('#try');
  const seen = await page.evaluate(() => {
    const prog = document.getElementById('program');
    const program = prog.querySelector('.cdp-program-guidance');
    const first = prog.config.entries[0];
    const onList = program.checkVisibility();
    prog.querySelector('.cdp-start').click();
    const seq = prog.querySelector('cadence-sequence');
    return {
      programShown: onList,
      programText: program.textContent,
      // KD-2 puts the standing rules on the list view; leaving them up during
      // a run is what stacks cards above the clock (KD-6).
      programDuringRun: program.checkVisibility(),
      entry: prog.querySelector('.cdp-entry-guidance').textContent,
      // The data really carries them, at both narrow scopes.
      blockGuidance: (first.sequence.blocks[1].guidance || []).map((b) => b.heading),
      cues: first.sequence.blocks[1].steps.map((s) => s.cue).filter(Boolean).length,
      // And the warm-up block, which carries none, shows none — the scoping
      // rule holding on the shipped example rather than a fixture.
      atWarmup: seq.querySelector('.cds-label').textContent,
      warmupBlock: seq.querySelector('.cds-guidance').textContent,
      warmupShown: seq.querySelector('.cds-guidance').checkVisibility(),
    };
  });
  expect(seen.programShown).toBe(true);
  expect(seen.programDuringRun).toBe(false);
  expect(seen.programText).toContain('never two days running');
  expect(seen.entry).toMatch(/rounds of \d moves/);
  expect(seen.blockGuidance).toContain('Watch for');
  expect(seen.cues).toBeGreaterThan(0);
  expect(seen.atWarmup).toBe('Warm-up');
  expect(seen.warmupBlock).toBe('');
  expect(seen.warmupShown).toBe(false);
});
