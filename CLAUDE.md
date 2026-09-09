# Cadence — project conventions

These are the implicit rules established while building the first component
(the clock — see `sdd/archive/catalog.md` for its full spec once archived).
They apply to every component in this project, not just that one.

## No framework, no build step

- No JS framework, no CSS framework. Components are vanilla Custom Elements
  (`class extends HTMLElement`, `customElements.define(...)`); styling is a
  hand-written CSS file using custom properties.
- No bundler, no transpilation, no CDN `<script>`/`<link>` tags. A `<script>`
  only needs `type="module"` if it actually uses `import`/`export` — most of
  this codebase doesn't, and a plain classic script avoids a real failure
  mode: module scripts are blocked by CORS when the page is opened via
  `file://`, so they silently never run.
- The page must work two ways with no changes: opened directly as a local
  file (double-click / `file://`) and served over http(s) (GitHub Pages).
  Test both — a bug that only shows up in one of them is easy to miss.
- Playwright is the only devDependency, and it's dev-only: nothing it
  provides ships in the page itself.

## Shared design system

- One shared stylesheet (`css/theme.css`) — custom properties for color and
  spacing, dark/light via `prefers-color-scheme`. No per-component one-off
  styles.
- Components render in light DOM, not a shadow root, specifically so that
  shared stylesheet reaches them with no duplication or `adoptedStyleSheets`
  wiring.

## Component contract

- Config is handed to a component as a JS property/method
  (`el.configure({...})`), never as an HTML attribute — attributes are
  string-only and can't carry numbers or optional fields cleanly.
- A component auto-starts as soon as it's configured. There is no separate
  `start()` to call and no user-facing start control on the component
  itself — if one is needed (e.g. to satisfy a browser's audio-gesture
  requirement), that's the embedding page's job, not the component's.
- Lifecycle is signaled as CustomEvents dispatched on the component's own
  root element (e.g. `cadence:start`, `cadence:complete`, `cadence:beep`),
  with an optional convenience callback in config for the common
  single-owner case. The event is the source of truth; the callback is
  sugar around listening for it.

## Audio

- Browsers require a user gesture before Web Audio produces sound; a
  component that auto-starts with none will be silently muted (no
  exception thrown). A component should make a best-effort `ctx.resume()`
  attempt on every sound it plays, but does not manage unlocking audio
  itself — that responsibility belongs to whatever page embeds it (a real
  session always has an explicit human "start" moment upstream).

## Accessibility

- Every non-visual cue (a beep) pairs with a visual equivalent, so nothing
  is communicated by sound alone.
- ARIA live regions announce meaningful state changes only (e.g. start,
  complete) — never a continuous tick, which would spam assistive tech.

## Time and duration

- Durations are authored in JSON as a number of seconds (fractional
  allowed), matching how a program step is described in prose ("20s leg
  raise"). Convert to milliseconds internally for the timing loop.
- Displayed time is `m:ss` under an hour (seconds zero-padded, no leading
  zero on minutes) and `h:mm:ss` from an hour, with the minutes padded once
  the hours lead — an unpadded minute reads as the wrong number behind a
  leading field. A short step keeps its short form beside a long total:
  `0:20` next to `2:14:30`. (Was `m:ss` always, which rendered a 3h38m
  effort as `218:00`; see the `hours-on-the-clock` spec.)

## Verification

- Prefer a `--check` command over hand-attestation whenever one is
  possible; Playwright drives a real browser against the static files
  directly, no framework or build step involved in the testing either.
- A passing check is only as trustworthy as its environment's fidelity to
  production. Test runners often relax real restrictions for automation
  convenience (Playwright's default headless Chromium disables the
  autoplay-gesture policy real browsers enforce) — a green check can still
  hide a real gap if the thing it bypasses is exactly what the criterion is
  meant to prove.
