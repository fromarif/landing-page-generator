<!-- part of docs/ — see docs/README.md for the index -->

# Scroll sequence

`modules/sequence.ts` scrubs a frame sequence onto a canvas while the section is
pinned — the technique from Cuberto's `scroll-sequence-demo`, rebuilt on this
scaffold's scroll stack.

```astro
<Sequence heading="Scrubbed frame by frame." count={60} src="/sequence/" />
```

Frames are `001.webp`, `002.webp`, … under `src`.

## Choosing where it runs

`start` and `end` take ScrollTrigger's `"<section edge> <viewport edge>"` syntax,
so the scrub can be anchored anywhere:

```astro
<Sequence start="top center" end="center top" />  <!-- a short burst mid-screen -->
<Sequence pin={0} />                              <!-- scrub while passing, no pin -->
<Sequence pin={4} />                              <!-- held four screens -->
```

| prop | default | |
|---|---|---|
| `start` | `top bottom` | section's top meets the viewport's bottom |
| `end` | derived from `pin` | see below |
| `pin` | `2` | screens held at the top; `0` disables pinning |

Measured: `start="top center"` resolves to 1530 and `end="center top"` to 2494 on
a 964px viewport with the section at 2012 — exactly half a screen either side, as
written.

### `end="bottom top"` is a trap while pinning

It is the obvious way to say "until the section has left", and it is wrong here.
ScrollTrigger measures it from the section's *natural* position and knows nothing
about the pin, which is a separate trigger — on a two-screen pin it lands 1928px
early and cuts the exit off. Measured: 2976 instead of 4904.

So the default end counts screens instead: one in, `pin` held, one out. With
`pin={0}` there is nothing to account for, and the default becomes the semantic
`bottom top` — which is then exactly right.

## What was changed from the original, and why

**It no longer waits for every frame.** The demo does `Promise.all` over all 162
images and draws nothing until the last one lands. Here each frame draws as it
decodes, and `draw()` falls back to the nearest frame already decoded rather than
blanking the canvas — so the sequence is usable while it is still filling in.

**Frames are not fetched until the section is near.** A separate `once`
ScrollTrigger at `top bottom+=100%` starts the loading, roughly two viewports
out. Verified: landing on the page at scroll 0 fetches **zero** frames.

**`Image.decode()` instead of XHR-to-blob.** The original loaded via
XMLHttpRequest to guarantee the image was decoded before use. `decode()` does
that natively now, and keeps normal HTTP caching instead of object URLs.

**Pin and scrub are separate triggers.** The demo puts both on one trigger
running `top top` → `+=200%`, so the frames only move while the section is locked
to the top of the screen — dead on the way in, dead again on the way out.

Pinning genuinely cannot start before the section reaches the top or continue
after it releases. The frames have no such limit, so the scrub spans the whole
time any part of the section is on screen: one screen of entry, `PIN_SCREENS`
pinned, one screen of exit.

```
scrub   1048 ──────────────────────────────────── 4904
pin              2012 ─────────────── 3940
        │ entry │      pinned        │ exit │
```

Both constants come from `PIN_SCREENS`, so changing the pin duration moves the
scrub with it instead of silently desynchronising them.

**No `pinType: 'transform'`.** That was required because the demo scrolls a
`smooth-scrollbar` container. Lenis drives native window scroll, so
ScrollTrigger's default pinning is correct here — forcing `transform` would
break it.

**Canvas DPR is capped at 2.** A 3x phone would otherwise allocate a buffer over
twice the area for no visible gain.

## Weight is the whole problem with this technique

The original demo ships **162 JPEGs, 7.2 MB**, for one section. That is
straightforwardly incompatible with this project's "fast" requirement.

The demo sequence here is **483 WebP frames, 822 KB** — 1.7 KB per frame. It was generated with ffmpeg (metaballs, thresholded, looping), the same
way `public/video/blob.mp4` was.

### Frame count is a smoothness budget, not a size budget

What matters is **scroll pixels per frame**, not the frame count on its own. The
scrub spans `SCRUB_SCREENS` of viewport, so on a 964px-tall screen:

| | frames | px per frame | weight |
|---|---|---|---|
| first attempt | 60 | 64 — visibly stepped | 240 KB |
| second | 192 | 20 | 327 KB |
| now | 483 | 8 | 822 KB |
| `scroll-sequence-demo` | 162 over 2 screens | 12 | 7.2 MB |
| ferrumpipe.demo.cubdev.com | 109 (hero) | ~8 | ~12.9 MB |

8px per frame is what Cuberto ships on a real client site. Measured on
ferrumpipe.demo.cubdev.com by patching `drawImage`: 52 distinct frames drawn
across 416px of scroll. Their hero frames are 1920×1080 photographic renders at
~118 KB each, so that density costs them roughly 12.9 MB for one section, and
another ~6.7 MB for the next (137 frames at ~49 KB).

Ours reaches the same density for 822 KB because the frames are synthetic,
blurred and 800×450. **That is a content difference, not a technique win** — do
not expect the same ratio with real footage.

At 64px per frame the image only changes every third or fourth display frame
during a normal scroll, which reads as a slideshow however smooth the scroll is.

Measured directly on the frames rather than through the scroll (Lenis makes
scroll-position sampling unreliable): the mean per-pixel difference between
adjacent frames is **2.92** at 192 frames versus **8.13** at 60 — each visual
step about a third the size. At 483 it is finer again.

Going denser is cheap here because the frames are small and nearly identical, so
they compress well. Photographic frames will not behave like this — there, cut
the scrub distance rather than the frame count.

Replace it per project, and treat the budget as the design constraint: fewer
frames scrubbed over a longer pin reads better than many frames crammed into a
short one, and costs less. If a project needs photographic frames, it needs a
real asset pipeline — not this folder.

## How Cuberto loads them, and why this doesn't

Their production site still uses the repo's `preloadImage` pattern — XHR to a
blob, then `URL.createObjectURL`. Confirmed by patching `drawImage`: the sources
it receives are blob URLs, not file paths.

They also **preload everything, early**. Their `options` sequence had 101 of its
137 frames fetched while the viewport was still at the top of the page, nowhere
near that section. Hero frames arrived 1→109 contiguous with no gaps.

This module defers instead (`once` trigger two screens out) and draws
progressively. With 483 frames that is a real difference in what a visitor pays
for if they never scroll that far.

### Measuring this is where it gets easy to fool yourself

`performance.getEntriesByType('resource')` caps at 250 entries by default and
silently drops the rest — it reported 190 of 483 frames and looked exactly like
the loader stalling. Raising the buffer afterwards does not recover them. The
browser's network log showed all 483 requests. Use the network panel for counts
this large, not resource timing.

## Teardown

The module keeps its own `destroy()` per instance because it owns a `resize`
listener and two ScrollTriggers, and because in-flight decodes must be ignored
after a swap (`alive` flag) rather than writing into a discarded canvas.

Verified across repeated navigations: the section's own ScrollTriggers settle at
exactly 3 (preload, pin, scrub), the page total is stable at 17, and
`.pin-spacer` goes 1 → 0 → 1 without accumulating. Counts taken after scrolling
through read lower because `once` triggers self-kill once fired — that is
accounting, not a leak.

## Verified behaviour

- Frames advance *before* the pin: at `scrollY` 1100/1500 the section top reads
  912/512 — still rising, not pinned — with the fingerprint changing between them.
- Frames still advance *after* it: at 4000/4400/4800 the pin has released and the
  section's bottom slides 904 → 504 → 104, fingerprint changing throughout.
- Pinning: top held at 0 from `scrollY` 2100 through 3900.
- The measured ranges match the intent exactly: scrub 1048 → 4904, pin
  2012 → 3940, and 4904 is where the section's bottom reaches the viewport top.
- Lazy: 0 frames fetched at scroll 0, 60 after approaching.

## Reduced motion

`initSequence()` checks the media query itself and takes a static path: frames
load, the first one is drawn, and no pin or scrub ScrollTrigger is created. The
section becomes a still image rather than disappearing.
