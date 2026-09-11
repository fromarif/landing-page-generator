# Magnetic elements

Elements that lean toward the pointer while it is over them, then spring back.
Ported from [`Cuberto/cursor-magnetic-demo`](https://github.com/Cuberto/cursor-magnetic-demo)
(`src/js/magnetic.js`, v1.5.0) — see [What changed from the original](#what-changed-from-the-original).

Engine: `src/scripts/modules/magnetic.ts`. Example skin: `src/sections/Cta.astro`.

## Usage

```html
<a href="/contact/" data-magnetic>Let's talk</a>
```

That is the whole API. Tuning is optional and goes in the attribute as JSON:

```html
<a data-magnetic='{"x":0.35,"y":0.1,"s":0.15,"rs":0.9}'>…</a>
```

| Key | Default | Meaning |
|---|---|---|
| `x` | `0.2` | Horizontal pull, as a fraction of pointer distance from centre |
| `y` | `0.2` | Vertical pull |
| `s` | `0.2` | Attract duration (seconds) |
| `rs` | `0.7` | Release duration (seconds) |

Malformed JSON falls back to the defaults rather than throwing — a typo in a
section should not take down the page.

`x` and `y` are independent on purpose. A wide pill button usually wants more
horizontal travel than vertical (`{"x":0.3,"y":0.12}`); a circle wants them equal.

## Rules

- **Never put `data-reveal` and `data-magnetic` on the same element.** Both write
  GSAP `y`, and magnetic tweens use `overwrite: true`. Hovering mid-reveal kills
  the reveal tween and leaves the element stuck at `autoAlpha: 0` — invisible,
  permanently. Wrap instead: reveal on the parent, magnetic on the child. That is
  exactly what `Cta.astro` does with `__action` around `__button`.
- **Do not nest magnetic elements.** Centre measurement subtracts the element's
  *own* transform but not its ancestors', so a magnetic child inside a magnetic
  parent measures a centre that is already displaced. One element per gesture.
- Hit-testing respects `border-radius`. On a circular button the corners are not
  hoverable, so the pull will never fire there — that is the browser, not a bug.
- Keep `will-change: transform` on anything magnetic; the element is transformed
  on nearly every pointer move.

## Pairing with the cursor

The signature Cuberto combination is a magnetic element that also sticks the
cursor to its centre:

```html
<a id="cta" data-magnetic data-cursor="-exclusion" data-cursor-stick="#cta">…</a>
```

The two effects pull in opposite directions — the element moves toward the
pointer, the cursor moves toward the element's resting centre — which is what
sells the "weight". There is no feedback loop: magnetic reads the real pointer
position (`e.clientX`), never the rendered cursor.

`data-cursor-stick` needs a selector, so the element needs an `id`. `Cta.astro`
generates one per instance at build time so two CTAs on one page do not both
stick to the first. MouseFollower captures the stick anchor once, on hover — it
does not track the element as it moves, which is the behaviour you want here.

Stick maths, measured on the live page: pointer at (690, 570), button centre at
(630, 544), `stickDelta` 0.15 → cursor renders at (639, 547.7). Confirmed.

## What changed from the original

**jQuery is gone.** It was used for `$.extend`, `.data()`, `.offset()` and event
binding — all of which have direct platform equivalents. Nothing else in the
scaffold pulls jQuery, and adding 30 KB for four calls is not a trade worth making.

**Stale-centre bug, fixed.** The original caches the element's position on
`mouseenter` via `$.offset()`, which reports the element's *current, transformed*
box. Leave and re-enter before the 0.7s release tween finishes and you measure a
centre that is still displaced, so the next pull is computed from the wrong origin
and the element jerks. Reproduced on the live page: with 60px of residual offset
and the pointer resting exactly on the true centre, the original's measurement
yields a `(-12, -8)` displacement where the correct answer is `(0, 0)`. The fix is
one line — subtract the element's own `x`/`y` before taking the centre:

```ts
const r = el.getBoundingClientRect();
cx = r.left - offset(el, 'x') + r.width / 2;
```

**Scroll staleness, fixed.** The centre is cached in viewport coordinates, so
scrolling while hovering invalidates it. The original never re-measures. This
version re-measures on `scroll`, but only while the pointer is inside the element,
so the listener exists for the duration of a hover and not a millisecond longer.

**Teardown added.** The original binds and never unbinds. Under `<ClientRouter />`
that matters: click the button and the page swaps while the pointer is still
inside it, so `mouseleave` never fires and a live tween is left writing transforms
to a detached node. `destroyMagnetic()` removes every listener, kills tweens and
clears the transform. Verified across a navigation: 1 live tween before the swap,
0 after; scroll listeners 1 added / 1 removed; transform cleared.

**`pointer*` instead of `mouse*` events**, plus a `(pointer: fine)` guard so the
effect never binds on touch. Verified under mobile emulation: `[data-magnetic]`
elements stay inert.

**Release ease.** The original uses GSAP's default (`power1.out`) — a flat glide
back. This version uses `back.out(1.8)`, one clean overshoot, which reads as a
spring rather than a slide. It is a feel choice, not a correctness one; change the
`ease` in `magnetic.ts` if you want the original.

## Reduced motion

`initMagnetic()` is called from the non-reduced branch of `onPageLoad()`, so the
whole effect is skipped and elements stay where the layout put them. Nothing extra
is needed inside the module.
