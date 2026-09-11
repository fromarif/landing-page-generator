<!-- part of docs/ — see docs/README.md for the index -->

# Lifecycle

`<ClientRouter />` swaps page content without a full reload, which splits
everything into two categories:

| | What | When |
|---|---|---|
| **Persistent singletons** | Lenis, cursor | created once in `boot()`; their DOM nodes are `transition:persist` |
| **Page-scoped** | ScrollTriggers, marquees, sequences | built on every `astro:page-load`, torn down on every `astro:before-swap` |

```
boot()                          runs once — the <script> is not re-executed on navigation
  ├─ initLenis + wireScroll     persist
  ├─ initCursor                 persist
  └─ listeners
       astro:page-load          → initReveal() + initSplit() + initReeller()
                                  + initMagnetic() + initJelly()
                                  + playAutoplayVideo() + initSequence()
                                  + initBgLines() + refreshScroll()
       astro:before-swap        → killPageTriggers() + destroyReeller()
                                  + destroySplit() + destroyMagnetic()
                                  + destroyJelly() + destroySequence()
                                  + destroyBgLines() + rememberHtmlClasses()
       astro:before-preparation → showOverlay()
       astro:after-swap         → restoreHtmlClasses() + syncLenisToDocument()
                                   + resetCursor() + hideOverlay()
```

Adding a DOM-touching module: register its build in `onPageLoad()` and its
teardown in `onBeforeSwap()`. ScrollTriggers are already covered by
`killPageTriggers()`. Anything with its own observers or timelines must have its
`destroy()` called explicitly — `modules/reeller.ts` is the worked example, and
[marquee.md](marquee.md) shows how the teardown was actually verified rather
than assumed.

Never initialise a DOM-dependent library at module top level.


Related: [swap gotchas](swap-gotchas.md) — three things `<ClientRouter />`
breaks that are already patched.
