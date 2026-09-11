# CLAUDE.md

Context for continuing this project. Read this fully before changing code.

## What this is

A **reusable scaffold** for building animation-heavy landing sites — the kind of
smooth, motion-forward marketing pages agencies like Cuberto ship. It is NOT a
one-off site; it is a starting point that gets re-skinned per client project.

Business intent (informs your judgment calls):
- Target quality is "memorable, distinctive client sites" — the differentiator is
  choreographed motion + art direction, not the boilerplate.
- **"Fast" is a hard requirement.** Do not trade Core Web Vitals for effects.
  No fake preloader timers that block real content. Lazy-load heavy assets.
- Respect `prefers-reduced-motion` everywhere. Motion is progressive enhancement.

## Stack

- **Astro 7** — static output, folder-based routing (`build.format: 'directory'`).
- **Lenis** — smooth scroll.
- **GSAP + ScrollTrigger** — animation. Note: since 2025 the ENTIRE GSAP toolset
  is free, including SplitText, ScrollSmoother and MorphSVG. The old "free
  plugins only" constraint no longer applies — SplitText in particular makes the
  per-character text reveal in the backlog a lot cheaper to build.
- **Cursor** — Cuberto's `mouse-follower`, persistent singleton. See
  [`docs/cursor.md`](docs/cursor.md).
- **Astro `<ClientRouter />`** — SPA-style page transitions over the static MPA.
- **SCSS** — component-scoped styles + a small global token layer.

## Commands

```bash
npm install        # verified: resolves clean on Node 24 / npm 11
npm run dev        # runs at http://localhost:4321 (also .claude/launch.json)
npm run build      # outputs static site to dist/ as folder/index.html per route
npm run preview
npm run check      # typecheck .ts AND .astro frontmatter — run before calling work done
```

## Core principle: engine vs skin

Keep a hard line between the two. This is what makes the scaffold reusable.

| Layer | Files | Change per project? |
|---|---|---|
| **Engine** (reusable) | `src/scripts/core/*`, `src/scripts/app.ts`, `astro.config.ts` | Rarely — treat as stable |
| **Skin / content** | `src/config/site.ts`, `src/styles/_tokens.scss`, `src/sections/*`, `src/pages/*` | Every project |

When adding features, ask: is this reusable machinery (→ `core/` or a `modules/`
file) or project-specific content (→ `sections/`, `pages/`, config)? Do not leak
project content into engine files.

## The lifecycle contract

`<ClientRouter />` swaps page content without a full reload. Get init/cleanup wrong
and ScrollTriggers pile up across navigations until animations break.

- **Persistent singletons** (Lenis, cursor): created once in `boot()`. The
  `transition:persist` directive must sit on the **HTML element** inside the
  component — putting it on the component itself does nothing and fails silently.
  Never re-init per navigation.
- **Page-scoped** (ScrollTriggers, marquees): built on `astro:page-load`, torn down
  on `astro:before-swap`.
- Never init a DOM-dependent library at module top level.

Two non-obvious handlers run on `astro:after-swap` — `restoreHtmlClasses()` and
`syncLenisToDocument()`. **Both are load-bearing; do not remove them.**

**→ Full detail, and the reasoning behind every choice, is in
[`docs/`](docs/README.md) — start with [lifecycle.md](docs/lifecycle.md) and
[swap-gotchas.md](docs/swap-gotchas.md) before touching `app.ts` or
`src/scripts/core/*`.**


## Conventions

- **Routing:** `src/pages/x.astro` → `/x/` → `dist/x/index.html`. One file per route.
- **Pages compose, they never author.** A page is imports + a `<BaseLayout>` with
  section components inside — no bespoke markup, no `<style>` block of its own. If a
  page needs something that doesn't exist yet, add a component in `src/sections/`
  and use it (that's what `sections/Prose.astro` is: the About page's old inline
  text block, lifted out). Keeps the skin layer reusable instead of one-off.
- **Reveal on scroll:** add `data-reveal` to any element; `modules/reveal.ts` animates it.
- **Scroll sequence:** `<Sequence start end pin />` — `start`/`end` use
  ScrollTrigger syntax, `pin={0}` turns pinning off.
- **Background lines:** `<Lines />` — WebGL line field, bows with scroll speed.
  Deliberately near-invisible; raise alpha/bend to tune. See
  [`docs/bglines.md`](docs/bglines.md).
- **Jelly scroll:** add `data-jelly` to a self-contained block (card, grid, text
  column) to make it shear with scroll speed. Safe to combine with `data-reveal`.
  See [`docs/jelly.md`](docs/jelly.md).
- **Magnetic elements:** add `data-magnetic` to anything that should lean toward
  the pointer. Tune with JSON in the attribute. Never on the same element as
  `data-reveal` — both write GSAP `y` and the reveal loses. See
  [`docs/magnetic.md`](docs/magnetic.md).
- **Text reveal:** add `data-split` (or `data-split="lines"`) to type that should rise
  out from behind a masked edge. Never both on one element.
- **Cursor states:** `data-cursor="-inverse"`, `data-cursor-text="View"`, etc. The
  vocabulary is MouseFollower's. Links and buttons need nothing — they get
  `-pointer` automatically. See [`docs/cursor.md`](docs/cursor.md).
- **Theme flip:** the Cuberto `-inverse` idea is done by overriding `--bg`/`--fg`
  locally on a section (see `sections/Showcase.astro`), not via a separate stylesheet.
- **Engine classes come from ONE knob**: `site.prefix` in `src/config/site.ts`.
  It drives markup + JS (`cls()` / `sel()` in `scripts/core/names.ts`) and SCSS
  (`$prefix` from the generated `src/styles/_prefix.scss`). Never write an engine
  class as a string literal. Engine style blocks must be `<style lang="scss">` and
  open with `@use '../styles/prefix' as *;`.
  **Do not replace the generated partial with `additionalData` — it breaks silently.
  See [`docs/prefix.md`](docs/prefix.md) for why, and what was already tried.**
- **Sections use the prefix too.** `cls('hero', 'title')` → `fa-hero__title`, and
  their `<style lang="scss">` opens with `@use '../styles/prefix' as *;`. One
  vocabulary for the whole DOM — engine and skin alike.
- **Modifiers stay unprefixed**: `-inverse`, `-pointer`, `-text`. They are states on
  an already-prefixed block, and it matches MouseFollower's own convention.

## Current state

**Installed, running and verified in a browser** (2026-09-11). `npm run build` is
clean and Home ↔ About navigation behaves. The zip it shipped in is extracted; two
broken `src/{config,layouts,...}/` directories (a failed brace expansion at pack
time) were deleted.

### Verified (items 1–4 of the original unknowns — all closed)
1. **Package versions** — all resolve. Upgraded off the original `^5` pin:
   astro 7.3.2, gsap 3.15.0, lenis 1.3.26, sass 1.104.0. Node 24 (Astro 7 needs ≥22.12).
2. **`<ClientRouter />`** — still the correct name in Astro 7, unchanged behaviour.
   Astro 7 removed the `astro:transitions/client` internals (`TRANSITION_AFTER_SWAP`,
   `createAnimationScope()`, …) but this scaffold never used them. The build passes
   the stricter Rust compiler with no markup complaints.
3. **Lenis + ClientRouter** — this WAS broken; fixed (see the two after-swap handlers
   above). Measured after the fix: scroll lands at 0 on forward navigation, and
   back-navigation still restores the previous offset.
4. **`transition:persist` + singletons** — was **broken**, now fixed. The directive
   was on the component (`<Cursor transition:persist />`), where it does nothing:
   it only works on HTML elements and on framework islands with a `client:`
   directive. A plain `.astro` component is compiled away, so the directive
   silently vanished — no attribute in the built HTML at all. It now lives on the
   root element *inside* `Cursor.astro` / `Loader.astro`.
   Verified: nodes keep their JS identity across navigation, and after navigating
   the cursor sits exactly on the pointer (522,261 vs 522,261). ScrollTriggers go
   12 → 3 → 12 with no accumulation.

### Still unverified
- **`prefers-reduced-motion`** — the code path reads correct (no Lenis, no reveal
  init, `getLenis()` returns null so the after-swap handlers no-op), but it has not
  been exercised at runtime. Test it before shipping anything to a client.
- **Touch / coarse pointer** — now verified under mobile emulation: MouseFollower
  never initialises, the host element is hidden, `has-cursor` is not added, and the
  native cursor stays intact. Still untested on real hardware.

## Cuberto open-source pieces (all MIT, all GSAP-based)

These are drop-in primitives. Integrate them per the lifecycle table below.

| Piece | Type | Where it goes | Notes / verify |
|---|---|---|---|
| `mouse-follower` | npm lib | ✅ **Done** — singleton in `boot()` | Not stale after all: 1.2.1, published 2026-08-31, ships its own types. The `@gwlab` fork is the stale one now (0.1.7, 2024). [`docs/cursor.md`](docs/cursor.md). |
| `reeller` | npm lib | ✅ **Done** — `modules/reeller.ts`, per-page | Now 0.1.2 (2026-05-07), ships types; the 0.0.6 beta note was stale. `destroy()` is the right name and clears both observers plus the timeline. Ships no CSS. [`docs/marquee.md`](docs/marquee.md). |
| `scroll-sequence-demo` | demo/technique (not npm) | ✅ **Done** — `modules/sequence.ts`, per-page | Rebuilt lazy + progressive; no `pinType: 'transform'` (that was for smooth-scrollbar). Demo asset is 822 KB at 8px/frame — Cuberto's own density, at 1/16th their weight. [`docs/scroll-sequence.md`](docs/scroll-sequence.md). |
| `transparentize-video-demo` | CSS technique + one lifecycle line | ✅ **Done** — `sections/Blob.astro` | The "markup + CSS only" prediction was wrong: `autoplay` does not survive a router swap, so `onPageLoad()` has to call `play()`. [`docs/blob.md`](docs/blob.md). |
| `bglines` | demo/technique (not npm) | ✅ **Done** — `modules/bglines.ts`, per-page | Upstream's bend is dead code (its render target is never written) and it needs Three.js for a 20-line shader. Rebuilt in raw WebGL with the bend driven by scroll velocity. [`docs/bglines.md`](docs/bglines.md). |
| `cursor-magnetic-demo` | demo/technique (not npm) | ✅ **Done** — `modules/magnetic.ts`, per-page | jQuery dropped; upstream's stale-centre bug fixed (it measures the *transformed* box on re-entry) and teardown added. The cursor half is already covered by `mouse-follower`. [`docs/magnetic.md`](docs/magnetic.md). |
| `jellyscroll` | demo/technique (not npm) | ✅ **Done** — `modules/jelly.ts`, per-page | Upstream ties skew to per-frame delta, so the effect halves on a 120 Hz screen and flickers on an uneven frame rate (measured: 39% swing). Rebuilt on one shared ticker, normalised to real frame duration. [`docs/jelly.md`](docs/jelly.md). |

Reality check: these are generic primitives anyone can install. They raise the floor;
they are not a moat. The distinctive part is how they're composed and art-directed —
that work is per-project and lives in `sections/`.

## Task backlog (suggested order)

1. ~~**Make it run + work through "Verify first" (1–4).**~~ ✅ Done — see
   "Current state". Remaining from this step: the reduced-motion runtime check.
2. ~~**Swap the custom cursor for `mouse-follower`**~~ ✅ Done.
   Remove `components/Cursor.astro`'s bespoke styles in favor of the lib's SCSS; keep the
   `transition:persist` on the root element (not on the component). Preserve the
   `data-cursor` hook convention.
3. ~~**Add `modules/reeller.ts`**~~ ✅ Done — plus `sections/Marquee.astro`.
4. ~~**Add a `transparentize-video` section**~~ ✅ Done — includes a generated 41 KB demo asset.
5. ~~**Build one genuinely bespoke interaction**~~ ✅ Done — `modules/split.ts`,
   masked per-character text reveal. [`docs/text-reveal.md`](docs/text-reveal.md).

## Guardrails (do NOT)

- Do not report work as done without running `npm run check`. Plain `tsc` cannot
  read `.astro` frontmatter; this catches what it misses. It found two real type
  errors that had been sitting in the scaffold since day one.
- Do not fill code files with explanatory comments. Keep them near-zero; a one-line
  pointer to the relevant page in `docs/` is enough. Long-form reasoning lives
  there — one page per topic, split rather than grow. See `docs/README.md`.

- Do not init DOM-touching libraries at module top level — client + lifecycle only.
- Do not re-init persistent singletons on navigation (causes duplicate cursors, etc.).
- Do not add fake/timed preloaders that block real content — it breaks the "fast" goal.
  Gating the overlay on *real* asset progress is allowed and implemented, but stays
  opt-in per section. See [`docs/loader-gating.md`](docs/loader-gating.md).
- Do not hand-write a class name. Every class in the DOM comes from `cls()` or
  `$prefix`; the only literals are the `-modifier` states.
- Do not put project-specific content into `src/scripts/core/*`.
- Do not put two modules that both animate GSAP `y` on one element (`data-reveal`
  + `data-magnetic`). Wrap instead — the outer element reveals, the inner moves.
- Do not drop `prefers-reduced-motion` handling when adding motion.
