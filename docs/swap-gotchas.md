<!-- part of docs/ — see docs/README.md for the index -->

# Swap gotchas

Four things `<ClientRouter />` breaks. All are already handled; none are
obvious from reading the code, so don't remove them.

## `transition:persist` goes on the element, not the component

The scaffold shipped with `<Loader transition:persist />` in `BaseLayout.astro`.
That does nothing. The directive only applies to HTML elements and to framework
islands carrying a `client:` directive; a plain `.astro` component is compiled
away, so the directive has nothing to attach to and disappears without a warning
— `data-astro-transition-persist` never appeared in the built HTML.

The result was subtle: the cursor node was replaced on every navigation while
`gsap.quickTo` kept animating the discarded one, so the cursor froze after the
first navigation. It now sits on the root element inside `Cursor.astro` and
`Loader.astro`.

**Counting elements does not test this.** `document.querySelectorAll('.app-cursor').length`
stayed at 1 the whole time, because a replacement node is still one node. Test
node *identity* (stamp a property on the node and look for it after navigating)
and test that the binding still drives the element.

**Measured after the fix:** nodes keep their JS identity across navigation; after
navigating, the cursor lands exactly on the pointer (522,261 vs 522,261);
ScrollTriggers go 12 → 3 → 12 with no accumulation.


Both are handled on `astro:after-swap`. Don't remove them.

## `restoreHtmlClasses()`

ClientRouter replaces the `<html>` attributes with the incoming document's,
which wipes the `lenis` / `lenis-smooth` classes Lenis writes at runtime. The
Lenis stylesheet then stops applying until the next scroll event re-adds them.
So: snapshot the class list before the swap, re-apply after.

Safe because no page authors classes on `<html>` itself. If one ever does,
filter the restore to a known list.

## `syncLenisToDocument()`

The router sets the scroll position during the swap — 0 going forward, the
remembered offset on back/forward. Lenis doesn't know that happened, so on the
next frame it animates the document back to the *old* offset and the new page
lands mid-scroll.

It adopts `window.scrollY` rather than hard-coding a scroll to 0, which is what
keeps back/forward restoration working.

**Careful:** these two bugs masked each other. Before the class fix, scroll
always read 0 after navigation and looked correct — but only because the missing
`lenis` class killed `height: auto`, collapsing the document so the browser
clamped the scroll. Fixing the class exposed the real behaviour: About was
landing at scroll 727.

## `autoplay` fires once, for the first page only

`autoplay` is honoured when the browser's parser inserts the element. The router
adopts nodes from the fetched document instead, which does not re-trigger it — so
a video plays on a hard load and sits frozen on every page reached by navigation.
Measured: after clicking back to the home page the video was paused and had
advanced 0.01s in 900ms.

`playAutoplayVideo()` runs from `onPageLoad()` and calls `play()` on every
`video[autoplay]`. The attribute is kept in the markup so the first load and the
no-JS case still work; the call covers the swaps. After the fix the video
advanced a full 1.00s in 1s of wall time.
