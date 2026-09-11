<!-- part of docs/ — see docs/README.md for the index -->

# Smaller decisions

**Lenis CSS is imported from the package** (`lenis/dist/lenis.css` in
`BaseLayout.astro`). The scaffold originally hand-copied those rules into
`_base.scss` and the copy had already drifted: it used `overflow: hidden` where
the package now uses `overflow: clip`, and it was missing the
`[data-lenis-prevent]`, iframe `pointer-events` and `autoToggle` rules. Don't
hand-copy them again.

**The loader is decorative, not a real preloader.** Don't block real content
behind a timer — it works directly against the "fast" requirement. Wire it to
actual asset progress if you want a counter.

**Sections are prefixed too, even though Astro already scopes them.** The scoping
argument says the prefix is redundant for sections — and for collision-avoidance
it is. It was kept anyway so that one knob renames every class in the DOM and
devtools reads consistently, rather than half the page carrying the project's
prefix and half not. See [prefix.md](prefix.md).

**GSAP types `then()` as `Promise<this>`**, ignoring the callback's return type.
The scaffold's `gsap.to(...).then(() => {})` therefore never produced the
`Promise<void>` its signature claimed. `showOverlay` / `hideOverlay` are `async`
and `await` the tween instead.

**`killPageTriggers()` kills every ScrollTrigger**, not just the current page's.
That's intentional — the engine creates none that need to survive a swap.

