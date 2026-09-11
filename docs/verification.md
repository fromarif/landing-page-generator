<!-- part of docs/ — see docs/README.md for the index -->

# Known-good measurements

Recorded 2026-09-11 on Astro 7.3.2 / gsap 3.15.0 / lenis 1.3.26 / Node 24.

- `npm run build` clean, including Astro 7's stricter Rust compiler.
- `npm run check` (`astro check`) clean: 0 errors across 20 files. Confirmed it
  actually checks rather than just passing — a deliberate type error planted in
  `.astro` frontmatter was reported, and the count returned to 0 on revert.
- Forward navigation lands at scroll 0; back-navigation restores the previous
  offset (~726 from 1000, the difference being Lenis mid-animation when the
  router snapshots).
- Flipping `prefix` live with the dev server running updates markup, JS hooks and
  CSS together; no stale rules.

## Not yet verified

- **`prefers-reduced-motion`** — the path reads correct (no Lenis, no reveal
  init, `getLenis()` returns null so the after-swap handlers no-op) but has never
  been exercised at runtime.
- **Touch / coarse pointer** — verified under mobile emulation (375x812, coarse
  pointer): `pointer: fine` false, MouseFollower never initialises (0 child nodes
  built), the host element is `display: none`, `has-cursor` is absent and
  `body { cursor }` stays `auto`. Untested on real hardware.

## Background lines

- The upstream repo's bend is dead: `setRenderTarget` appears nowhere, so the
  sampled render target is all zeros. Confirmed by porting the shader to raw
  WebGL and running it — twenty flat, near-motionless lines.
- The replacement responds to scroll: obviously wavy in a frame grabbed during a
  scroll, straight again three seconds later (checked with alpha and bend
  temporarily raised, since the shipped defaults are near-invisible).
- WebGL context is released on navigation: a reference held across a swap reports
  `isContextLost() === true`, and returning to the page builds a fresh context.
  Without that, the browser's ~16-context cap would break the site after enough
  navigations.

## Loader gating

- Default (no opt-in): overlay lifts without waiting — measured hidden by 2.4s
  with the counter empty.
- `preload="loader"`: the overlay defers to `whenAssetsSettled()` and the counter
  reaches 100 before it lifts. Localhost serves 822 KB too fast to show
  intermediate values, even after touching the files to force fresh ETags.
- Failure path: pointing the sequence at a missing folder made all 483 frames
  404; the counter still reached 100, the overlay still lifted, and the page
  stayed usable. A dead asset cannot hold the page hostage.
- Reference numbers from ferrumpipe.demo.cubdev.com: DOMContentLoaded 1476ms,
  109 hero frames complete at 6662ms, loader dismissed at 9412ms.

## Scroll sequence

- Overrides resolve correctly: `start="top center"` → 1530, `end="center top"` →
  2494, both matching a hand calculation. `pin={0}` removes the pin trigger and
  the `.pin-spacer`, and falls back to `bottom top` (2976).
- Frame density: 483 frames across the 3856px scrub = 7.98px per frame, matching what Cuberto ships on ferrumpipe.demo.cubdev.com (~8px, measured by patching `drawImage`). All 483 requests confirmed in the network log — resource timing caps at 250 and under-reports.
- Lazy load: 0 frames fetched sitting at scroll 0, all of them after approaching.
- Scrub runs for the whole time the section is on screen, not just while pinned:
  entering at `scrollY` 1100/1500 (top 912/512, unpinned) and leaving at
  4000/4400/4800 (bottom 904/504/104, pin released), fingerprint changing at every
  step.
- Measured ranges: scrub 1048 → 4904, pin 2012 → 3940. 1048 is where the section
  top meets the viewport bottom, 4904 where its bottom meets the viewport top.
- Teardown across repeated navigations: the section's triggers settle at 3,
  page total stable at 17, `.pin-spacer` 1 → 0 → 1, canvas 1 → 0 → 1.

## Text reveal (SplitText)

- `aria-label` carries the original string while the DOM is 31 nested divs, so
  the split is invisible to assistive tech.
- Lines animate from `yPercent: 115` — sampled at 67px mid-flight, 0 settled.
- `autoSplit` re-split proven by node identity: a tagged line node is absent from
  the document after a width change and replaced by a fresh one, text intact.
- Descender clipping fixed and checked: mask grows 95px → 117px while the
  heading's total height stays 190px; parked text sits 8px below the clip edge so
  nothing peeks; the padding is re-applied after a re-split (27.72px wide,
  22.04px narrow).
- Observer accounting across four navigations tracks 1 ↔ 3 (About has one split
  element, Home two plus Reeller) and never climbs, so `revert()` is releasing
  the ResizeObserver.

## Video knockout

- `mix-blend-mode` confirmed at runtime: video `screen`, tint `multiply`, wrapper
  `isolation: isolate`, tint `rgb(255,77,0)`.
- Containment checked: the neighbouring hero and showcase keep
  `rgb(244,244,244)` and `mix-blend-mode: normal`, so the blend does not escape.
- Autoplay across a swap: paused and stuck at +0.01s in 900ms before the fix,
  playing and advancing 1.00s per second after.

## Marquee (reeller)

- Teardown proven by counting live observers across four navigations (patching
  `observe`/`disconnect`): 0 → 1 → 0 → 1, never climbing. Clones stay at 4 and
  items at 8 — no accumulation either.
- Scroll-velocity response measured on the timeline's `timeScale`: peak **+2.23**
  scrolling down, **−3.16** scrolling up, easing back to ±1 once scrolling stops,
  and passing through `0.33` mid-flip rather than jumping between signs.
- Teardown re-checked with a navigation fired mid-scroll (settle still armed):
  observers 0 → 1 → 0 → 1 and infinite-timeline count 1 → 0 → 1 → 0, nothing left.
- `autoPlay` measured in both directions: above the fold the track transform is
  `none`; in view it advances ~41px per 400ms at `speed: 10`; scrolled back out
  it holds an identical value for 1.2s.

## Cursor (mouse-follower)

- Host node keeps its JS identity across Home ↔ About ↔ Home; position tracks the
  pointer exactly (300,300 / 650,420 / 200,700).
- `-pointer` applied automatically on links; `-text` plus the "View" string
  applied from `data-cursor-text`, and reverted on mouseout.
- Dot colour measured `rgb(14,14,14)` on light sections and `rgb(255,255,255)`
  on the `-inverse` Showcase.
- Cursor state reset across a swap: hovering a `data-cursor-text="View"` tile and
  navigating used to land on `/about/` with `-pointer -text` and "View" still
  showing. After the fix the class is bare `<prefix>-cursor`, the text node is
  empty and the dot is back to `scale(0.2)`. The stale-text hole was reproduced
  first (an element asking for `-text` with no text of its own rendered "View" at
  opacity 1) and re-tested after.
- Cursor reset animates rather than snapping: sampled every 40ms across a real
  navigation, the dot eases 1.7 → 1.65 → 1.04 → 0.42 → 0.20 (~240ms) and the text
  fades 1 → 0.93 → 0.50 → 0.24 → 0.08 → 0 (~400ms) with its glyphs present
  throughout; the node is emptied at t≈562ms, after the fade.
- Prefix coverage checked by flipping `prefix` live with the server running: the
  host, all four runtime-built children (`__inner`, `__media`, `__media-box`,
  `__text`), the `<html>` flag and every CSS selector followed together, with no
  `mf-` or stale-prefix classes left in the DOM.
- Sections verified on the prefix by flipping it live: every class in the DOM
  became `qq-*` with zero stale-prefix elements, and the styles still applied —
  hero `min-height: 964px` / `display: flex`, grid `display: grid`, `-inverse`
  background `rgb(14,14,14)`, and on /about/ prose padding 128px with a 40ch body.
- Production build checked separately via `npm run preview`: after a client-side
  navigation the styles hold (hero `964px`, navbar `fixed`, prose `128px`).
- Changing the prefix in dev now forces a full reload rather than a CSS patch.
  Verified twice from a click-navigated `/about/`, without touching the browser:
  the page reloaded itself, stayed on `/about/`, came back with hero `964px`,
  navbar `fixed`, prose `128px` and zero stale-prefix classes. A client-side
  navigation afterwards was clean (12 triggers, cursor tracking).
- The `_cursor.scss` port was diffed against the library stylesheet: all 8 states
  (`-active -exclusion -hidden -icon -inverse -media -pointer -text`) and all
  element selectors present, none dropped.
- Magnetic pull measured with synthetic and real pointer input: pointer 100px
  right / 60px below the resting centre produced `matrix(1,0,0,1,20,12)` — exactly
  `0.2 ×` the distance — and released back to `0,0`. With a real mouse at a 60/26
  offset the element sat at `translate3d(12px, 5.25px, 0)`.
- The upstream stale-centre bug was reproduced before fixing it: with 60px of
  residual transform and the pointer on the true centre, the original's
  measurement yields `(-12, -8)`; this version yields `(0, 0)`.
- Magnetic teardown verified across a click-through navigation (no `pointerleave`
  fires): 1 live tween before the swap → 0 after, scroll listeners 1 added /
  1 removed, inline transform cleared, node detached. Counted with the app's own
  GSAP instance — an earlier attempt imported `gsap` from a different URL than
  Vite's optimized dep and silently measured a second, empty instance.
- Cursor stick maths checked against the rendered position: pointer (690, 570),
  button centre (630, 544), `stickDelta` 0.15 → cursor at (639, 547.7), matching
  `centre + (pointer − centre) × 0.15` on both axes.
- Magnetic on coarse pointers: under mobile emulation `(pointer: fine)` is false
  and `[data-magnetic]` elements never bind — a dispatched `pointermove` leaves
  the transform empty.
- Jelly skew measured against real scroll: a wheel flick drove it to the ±5°
  clamp and it decayed smoothly to 0 (5 → 4.77 → 4.34 → 3.90 → … → 0.69 → 0) as
  Lenis eased out, with no residual transform once the page settled.
- Frame-rate independence measured by stretching every other frame on the live
  page (frames ranged 8–24 ms). Evaluating both formulas on the same recorded
  `(frame duration, scroll delta)` pairs: the upstream formula's skew-per-unit-
  velocity varied by 39%, this module's by 0%. Per-frame trace is in
  [jelly.md](jelly.md).
- An earlier attempt to test this with a hand-driven `window.scrollTo` ramp was
  thrown out: pausing the main thread also pauses the ramp, so the resumed loop
  jumps the scroll position instantly and the next frame legitimately reports a
  huge velocity. The artefact was the harness, not the module.
- Jelly teardown: `gsap.ticker` listener count stayed at 4 across five
  Home ↔ About navigations, the swapped-out node came back detached with its
  transform cleared, and each page built exactly one IntersectionObserver.
- `data-reveal` and `data-jelly` on one element verified safe — traced frame by
  frame, the transform reads `translate3d(0, 33.6px, 0) skew(0deg, -4deg)` with
  both effects live, and the reveal finishes at opacity 1. `quickSetter` is a
  direct write, so `overwrite` has no tween to kill.
- ScrollTrigger's pin measured as `position: fixed` with an identity transform on
  the live `Sequence` section, so it does not compete with a skew on the same
  element.
