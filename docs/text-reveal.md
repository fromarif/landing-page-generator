<!-- part of docs/ — see docs/README.md for the index -->

# Text reveal

`modules/split.ts` is the scaffold's signature moment: type rising out from
behind a masked line edge, staggered per character. Add `data-split` to any
element.

```astro
<h1 data-split>…</h1>            <!-- per character, with a slight rotation -->
<h2 data-split="lines">…</h2>    <!-- whole lines, for longer statements -->
```

It is separate from `data-reveal`. That one is the generic fade-and-rise for
anything on the page; this one rewrites the element's DOM and is meant for the
one or two pieces of type a page is actually built around. Don't put both on the
same element.

## What the modern SplitText gives you for free

The old advice — wrap every line in your own `overflow: hidden` div, re-split on
resize by hand — is obsolete. GSAP 3.13+ ships it:

- **`mask: 'lines'`** builds the clipping wrapper. This is what makes the motion
  read as type emerging from behind an edge rather than sliding up the page.
- **`autoSplit: true`** re-splits on resize *and on font load*. Both matter: line
  breaks depend on width, and a split measured against a fallback font is wrong
  the moment the real one arrives.
- **`aria: 'auto'`** puts the original string on the element as `aria-label` and
  hides the per-character spans from assistive tech. Verified: the hero reports
  `aria-label="We build things that move."` while its DOM is 31 nested divs.

Returning the animation from `onSplit` is the part that is easy to get wrong.
SplitText keeps that animation's playhead across a re-split, so a resize
mid-scroll does not restart the reveal. Confirmed in the source: `split()` calls
`this.isSplit && this.revert()` first, then re-applies the stored `animTime` to
whatever `onSplit` returns.

## Masking clips descenders

A line mask clips at the **line box**, and `g y p q j` hang below it. With
display type on tight leading — the hero runs `line-height: 0.95` against a
100px font — the mask sits exactly on the baseline area and shaves the tails off.
It looks like a font bug and isn't.

`onSplit` gives every mask `padding-bottom: 0.22em` with a matching negative
`margin-bottom`, so the clip box grows to cover the descender while the layout
height is untouched — measured 190px for two lines both before and after.

That taller clip box would let the hidden text peek, so the start offset is
`yPercent: 135` rather than 115. Both values are relative (em, and a percentage
of the element's own height), so the clearance scales with the type instead of
needing a value per heading. Measured with the text still parked: content sits
8px *below* the mask edge at the blob heading's size.

Re-applied on every re-split because it lives inside `onSplit` — after a width
change the new masks carry `27.72px` at the wider size and `22.04px` back at the
narrower one.

## It must be reverted on swap

`autoSplit` is backed by a **ResizeObserver**, so an un-reverted split leaks one
per element per navigation — on top of leaving the rewritten DOM behind.
`destroySplit()` calls `revert()`, which restores the original HTML and kills the
observer.

Measured by counting live observers across four navigations: the count tracks
1 ↔ 3 exactly as the pages demand (About has one split element, Home has two plus
Reeller's) and never climbs.

## Verified behaviour

- The lines animate from `yPercent: 115` to 0 — sampled mid-flight at 67px and
  settled at 0.
- Re-split on resize is real, not a reflow: a line node tagged before a width
  change is gone from the document afterwards and replaced by a fresh one, while
  the text and `aria-label` survive intact.

## On the intro timing

On a hard load the hero's reveal starts in the same frame the loader overlay
begins its 0.35s fade, so the first part of the motion plays through a lifting
veil. That is deliberate, and it was checked rather than assumed — frame grabs
show the characters clearly mid-stagger while the overlay is still up.

Delaying the reveal until the overlay is fully gone would buy a cleaner start at
the cost of dead time on first paint, which works against the project's "fast"
requirement. If a project wants it, add a delay to the `gsap.from` in
`onSplit` — but measure the intro again afterwards.
