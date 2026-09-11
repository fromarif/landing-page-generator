# astro-motion-scaffold

A reusable starting point for animation-heavy landing sites: **Astro** (static, folder-routed) + **Lenis** (smooth scroll) + **GSAP/ScrollTrigger** (animation) + a **custom cursor** + **SPA-style page transitions** over a static multi-page site.

Modelled on the structure Cuberto uses (static pages, persistent `#view-main` container, loader/cursor that survive navigation) — rebuilt on a modern stack.

## Run it

```bash
npm install
npm run dev
npm run check   # typecheck, including .astro frontmatter
```

> Verified running on Astro 7 / Node 24. Dev server is at `http://localhost:4321`.

## The idea: engine vs skin

The whole point of a reusable scaffold is a hard line between the two:

| | Files | Touch per project? |
|---|---|---|
| **Engine** (reusable) | `src/scripts/core/*`, `src/scripts/app.ts` | Rarely |
| **Skin / content** | `src/config/site.ts`, `src/styles/_tokens.scss`, `src/sections/*`, `src/pages/*` | Every project |

### New-project checklist
1. `src/config/site.ts` — name, nav, motion settings, and `prefix` (the engine's class prefix — one knob that renames `app-loader` / `app-cursor` / … across markup, JS and CSS at once).
2. `src/styles/_tokens.scss` — `--bg` / `--fg` (+ fonts).
3. `src/sections/*` — delete the examples (`Hero`, `Showcase`, `Prose`), build your bespoke sections. Add `data-reveal` to things that should animate in, `data-magnetic` to buttons that should lean toward the pointer, `data-cursor="hover"` to interactive targets.
4. `src/pages/*` — compose sections into routes. Each `*.astro` file → a folder route (`about.astro` → `/about/`).
5. New animation? Add a module in `src/scripts/modules/`, then call it in `app.ts → onPageLoad()`.

> Engine class names are never string literals — see [`docs/prefix.md`](docs/prefix.md).

> Pages never author markup or styles. They import section components and compose them. Need something new? Add it to `src/sections/` first.

## How the lifecycle works (the part that's easy to get wrong)

Astro's `<ClientRouter />` swaps page content without a full reload. That means:

- **Singletons** (Lenis, cursor) must be created **once** and survive swaps → `boot()` runs once; Loader + Cursor are marked `transition:persist`.
- **Page-scoped animations** (ScrollTriggers) must be **rebuilt** every navigation and **killed** before each swap, or they leak → handled in `astro:page-load` (build) and `astro:before-swap` (kill).

```
boot() [once]
  ├─ initLenis + wireScroll   (persist)
  ├─ initCursor               (persist)
  └─ add listeners:
       astro:page-load        → initReveal() + refreshScroll()   [every page]
       astro:before-swap      → killPageTriggers()                [every nav]
       astro:before-preparation → showOverlay()
       astro:after-swap       → restoreHtmlClasses() + syncLenisToDocument()
                                 + hideOverlay()
```

## Before you change the engine

`src/scripts/core/*`, `src/scripts/app.ts` and `astro.config.ts` contain a few
decisions that look like they could be simplified and cannot. The reasoning —
and the approaches already tried and rejected — lives in
[`docs/`](docs/README.md). Source files stay comment-free on purpose; that
folder is where the "why" is kept.

## Honest limitations

- **`prefers-reduced-motion` is not runtime-tested yet.** The code path reads correct, but exercise it before shipping to a client.
- **Native View Transitions are limited for heavy choreography.** Fine for fades/persist. For overlapping timelines or WebGL transitions (true Awwwards-level), you'll outgrow `<ClientRouter />` and drive navigation with GSAP + Barba/Taxi instead — `src/scripts/core/transition.ts` is where that swap happens.
- **The loader is decorative, not a real preloader.** Don't block real content behind a fake timer — it directly hurts the "fast" goal. Wire it to actual asset progress if you want a counter.
- **Every class comes from one prefix**, sections included — see [`docs/prefix.md`](docs/prefix.md). Only `-modifier` states are written literally.
