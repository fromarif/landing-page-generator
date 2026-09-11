<!-- part of docs/ — see docs/README.md for the index -->

# Marquee

Cuberto's [`reeller`](https://github.com/Cuberto/reeller) drives the running text
in `sections/Marquee.astro`. Unlike the cursor it is **page-scoped**, not a
singleton: built in `onPageLoad()`, destroyed in `onBeforeSwap()`.

## It is the reason the teardown rule exists

`killPageTriggers()` covers ScrollTriggers and nothing else. Reeller owns an
IntersectionObserver, a ResizeObserver and a GSAP timeline of its own, none of
which a ScrollTrigger sweep can reach. Miss the `destroy()` and every navigation
leaves another set running against detached DOM.

`destroy(removeClones, clearProps)` handles all three — it disconnects the
IntersectionObserver, kills the timeline, and delegates to `Filler.destroy()`
which disconnects the ResizeObserver. Both arguments are passed `true` so the
injected clones and inline transforms go too.

Proven by patching `observe`/`disconnect` and counting live observers across four
navigations: the count oscillates 0 → 1 → 0 → 1 and never climbs. A leak would
show 1, 2, 3.

## Package note

The version pinned in the old notes (0.0.6, "beta, verify the destroy method
name") is out of date. It is 0.1.2, published 2026-05-07, and ships its own
types. `destroy()` is the correct name — verified in the type definitions and the
source.

**It ships no CSS.** The container needs `overflow: hidden` and the track
`display: flex; width: max-content`; both live in `Marquee.astro`. Set the
overflow yourself rather than relying on Reeller — it applies its own at init,
which is too late to stop a flash of overflowing content.

## Markup contract

```astro
<Marquee items={['Motion', 'Design']} speed={10} reverse />
```

The module finds containers by `[data-marquee]` — the same data-attribute hook
convention as `data-reveal` — and reads `data-marquee-speed` /
`data-marquee-reverse` from them. The track and items are found by their
prefixed classes, built through `sel()` so they track the prefix.

## autoPlay earns its keep

Reeller's `autoPlay` (on by default) uses the IntersectionObserver to pause the
timeline while the marquee is off screen. Measured: sitting above the fold the
track's transform is `none` and never advances; scrolled into view it moves
steadily (~41px per 400ms at `speed: 10`); scrolled back out it freezes at an
identical value for 1.2s.

That matters for the project's "fast" requirement — an animated marquee below the
fold would otherwise run a GSAP timeline for the whole visit.

## Scroll velocity drives it

A ScrollTrigger per marquee reads `self.getVelocity()` on update and writes the
Reeller timeline's `timeScale` through a `gsap.quickTo` ramp. Scrolling down
speeds it up; scrolling up makes it run backwards.

The direction is the **sign** of the timeScale rather than Reeller's `reverse()`,
which matters: the value eases through zero instead of snapping, so a change of
scroll direction reads as the track slowing, stopping and turning around.
Measured while scrolling down from a reversed state: `-1 → 0.33 → 2.22 → 2.23 →
1.87 → 1.56 → 1.33` — the 0.33 is the track passing through the turn.

Boost is `|velocity| / 600`, capped at 5, so a hard flick can't smear the text.
Measured peaks: **+2.23** scrolling down, **−3.16** scrolling up.

When scrolling stops, `onUpdate` stops firing and the track would be stranded at
whatever boost it reached — so each update arms a `gsap.delayedCall` that eases
back to base speed, keeping the direction the scroll left it in.

Turn it off per section with `velocity={false}` for a constant-speed marquee.

### The ramp and the settle need their own teardown

Both live outside the Reeller instance, so `destroy()` cannot reach them: a
navigation with a settle still pending would fire it afterwards against a killed
timeline. `destroyReeller()` kills the pending `delayedCall` and calls
`gsap.killTweensOf(instance.tl)` before destroying the instance.

Verified by navigating mid-scroll while the settle was armed: observers go
0 → 1 → 0 → 1 and the infinite timeline count follows, with nothing left behind.

## Reduced motion

`initReeller()` is only called on the non-reduced branch of `onPageLoad()`, so the
marquee renders as a static row of items, clipped by the container's overflow. No
clones, no timeline, no observers.
