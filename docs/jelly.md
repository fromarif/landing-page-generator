# Jelly scroll

Blocks that shear slightly in the direction you are scrolling, then settle.
Ported from [`Cuberto/jellyscroll`](https://github.com/Cuberto/jellyscroll)
(`src/js/jelly.js`, v1.0.1) — see [What changed](#what-changed-from-the-original).

Engine: `src/scripts/modules/jelly.ts`. Used by `sections/Showcase.astro` and
`sections/Prose.astro`, both behind a `jelly` prop.

## Usage

```html
<div data-jelly>…</div>
```

```astro
<Showcase heading="Selected work" jelly />
<Prose jelly>…</Prose>
```

Tuning is optional, as JSON in the attribute:

```html
<div data-jelly='{"intensity":0.25,"min":-8,"max":8}'>…</div>
```

| Key | Default | Meaning |
|---|---|---|
| `intensity` | `0.15` | Degrees of skew per pixel of scroll movement in one 60 fps frame. Negative inverts. |
| `min` / `max` | `-5` / `5` | Clamp, in degrees. This is what stops a fast flick from folding the layout in half. |

Put it on a **self-contained block** — a card, a grid, a text column. Skewing a
full-bleed section shears its edges against its neighbours and looks like a
rendering bug rather than an effect. Cuberto's own demo skews rounded cards with
generous margins, which is the honest version of this effect.

## What it can sit next to

- **`data-reveal` on the same element is fine.** Verified: reveal's `y` and
  jelly's `skewY` compose into one matrix (`translate3d(0, 33px, 0) skew(0deg,
  -4deg)`), opacity still lands on 1 and the reveal tween completes. This works
  because jelly writes through `gsap.quickSetter` — a direct write, not a tween —
  so there is nothing for `overwrite` to kill. **This is the opposite of
  `data-magnetic`**, which must never share an element with `data-reveal`; see
  [magnetic.md](magnetic.md).
- **Pinned sections don't conflict.** ScrollTrigger pins via `position: fixed`
  with an identity transform (measured on the live `Sequence` pin), so a skew on
  the same element has nothing to fight. Whether you *want* it is another
  question — a pinned element is held still while the scroll delta keeps running,
  so it will shear for the whole length of the pin.

## What changed from the original

**One shared loop instead of one per element.** The original gives every jelly
element its own `requestAnimationFrame` loop, each independently reading the
scroll position and writing a transform. Ten elements meant ten loops doing the
same scroll read. This version runs a single `gsap.ticker` callback — the same
ticker that already drives Lenis — and one `IntersectionObserver` for the whole
set instead of one per element.

**Frame-rate independence.** This is the substantive fix. The original computes
`skew = diff * intensity`, where `diff` is how far the page moved *in one frame*.
That makes the effect a function of refresh rate, not of scroll speed: the same
gesture gives half the skew on a 120 Hz display, and on an uneven frame rate the
skew flickers. This version divides by the real frame duration, so skew tracks
velocity.

Measured on the live page, deliberately stretching every other frame (recorded
frame lengths ranged 8–24 ms) while the scroll velocity decayed smoothly:

| frame | real velocity | original | this version |
|---:|---:|---:|---:|
| 24 ms | 3354 px/s | 12.07° | 8.39° |
| 11 ms | 3000 px/s | 4.95° | 7.50° |
| 24 ms | 2729 px/s | 9.82° | 6.82° |
| 8 ms | 2438 px/s | 2.92° | 6.09° |
| 24 ms | 2250 px/s | 8.10° | 5.63° |
| 10 ms | 2000 px/s | 3.00° | 5.00° |

The original's output swings 12° → 5° → 10° → 3° while the page is doing nothing
but decelerating smoothly. Across the whole capture, its skew-per-unit-velocity
varied by **39%**; this version's by **0%**. With the default ±5° clamp the
original's wobble is mostly hidden — raise `intensity` and it becomes visible.

**Teardown that the router needs.** The original's loops are stopped only by its
IntersectionObserver, and `destroy()` is never called by anything. Under
`<ClientRouter />` the observed nodes are swapped out while still intersecting,
so the loops keep running against detached elements. `destroyJelly()` removes the
ticker callback, disconnects the observer and clears the transform. Verified over
five back-and-forth navigations: `gsap.ticker` listeners stayed flat at 4, and
the old node came back detached with its transform cleared.

**`speed` and `pause()` are gone.** Both existed to serve the demo's Smooth
Scrollbar: `pause()` froze the effect while you dragged the scrollbar thumb, and
`speed` was the duration of the tween back to zero when that happened. We use
Lenis, which has no draggable track, so both were knobs that could never be
turned. A config option that does nothing is worse than no option.

**`scrollPos` is gone too.** It existed so you could hand the effect Smooth
Scrollbar's virtual offset. Lenis scrolls the document for real, so
`window.scrollY` is already the right answer — the same reason
`syncLenisToDocument()` in `app.ts` reads it directly.

**`data-cuberto-jelly` → `data-jelly`**, matching `data-reveal`, `data-split` and
`data-magnetic`. Hook attributes are unprefixed by convention; only classes carry
`site.prefix`. See [prefix.md](prefix.md).

## Reduced motion

`initJelly()` is called from the non-reduced branch of `onPageLoad()`, so the
effect never binds and elements keep their untransformed layout.
