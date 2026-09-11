<!-- part of docs/ — see docs/README.md for the index -->

# Loader gating

The intro overlay can hold the page until a section's assets are in, with a real
percentage counter. **Off by default.** Opt a section in:

```astro
<Sequence preload="loader" />
```

## Why it is opt-in

`ferrumpipe.demo.cubdev.com` does this unconditionally, and it is the right call
*there*: their sequence is the hero, the first thing on screen. Measured on that
site:

```
1476 ms   DOMContentLoaded
1912 ms   loader up, 6 of 109 hero frames in
5662 ms   103 frames
6662 ms   109 frames — complete
9412 ms   loader finally dismissed
```

Nine and a half seconds before the site is usable, for ~12.9 MB of hero frames.
Their loader carries a real counter (`fp-loader_overlay-counter-perc`) and the
visible-state class comes off only after the frames land — so it is gated on
actual progress, not a timer.

This scaffold's demo sequence is the *fourth* section, below the fold, already
deferred until two screens out. Gating first paint on it would cost LCP and buy
nothing. Gating is therefore a per-project decision, which is also what keeps
`CLAUDE.md`'s "no preloaders that block real content" honest: the rule is against
**fake timers**, and the README always allowed wiring the counter to real asset
progress.

## How it works

`core/progress.ts` is a counter, not a loader. Anything that wants to be waited
for calls `expectAssets(n)` and then `assetSettled()` per item; `app.ts` checks
`assetsPending()` on first load and defers `hideOverlay()` until
`whenAssetsSettled()` resolves, feeding the ratio to the overlay counter.

Two deliberate limits:

- **First load only.** A client-side navigation already has the overlay in
  flight; holding it for a section's assets would read as a broken transition
  rather than a deliberate one.
- **A dead asset cannot hold the page hostage.** `whenAssetsSettled()` has a 10s
  cap, and the sequence reports every frame in a `.finally()` so a rejected
  decode still counts. Verified by pointing the sequence at a folder that does
  not exist: all 483 frames 404, the counter still reached 100, the overlay
  still lifted, and the rest of the page worked — the section just rendered an
  empty canvas. Ferrumpipe's own loader would wait forever in that situation.

## Using it for something else

Nothing in `progress.ts` knows about sequences. Any module can register work:

```ts
import { expectAssets, assetSettled } from '../core/progress';

expectAssets(fonts.length);
fonts.forEach((f) => f.load().finally(assetSettled));
```

Register before `onPageLoad()` finishes, or the first-load check will already
have run and released the overlay.
