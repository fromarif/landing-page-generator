<!-- part of docs/ — see docs/README.md for the index -->

# Spacing, container and size

Values live in `src/styles/_tokens.scss` as CSS custom properties. The base boxes
live in `src/styles/_layout.scss` as real classes, and every component owns a
container class extended from them:

```scss
@use '../prefix' as *;
@use '../layout' as *;

.#{$prefix}-navbar {
  &__container {
    @extend .#{$prefix}-container;
    display: flex;
    max-width: var(--container-narrow);
  }
}
```

Every component that extends the base joins one shared rule, and keeps a second
rule for whatever it changes:

```css
.fa-container, .fa-navbar__container, …every other extender… { max-width: …; … }
.fa-navbar__container { display: flex; max-width: var(--container-narrow); }
```

Override by declaring after the `@extend`. That is safe, not a coincidence: Sass
emits the shared rule at the base class's position — the top of the bundle, since
`main.scss` loads `layout` before any component — so source order decides between
two selectors of equal specificity, and the override wins.

## Why the styles are not in `.astro` files

That grouped selector list is the whole reason `src/styles/` exists. `@extend`
can only join selectors compiled in the **same unit**, and Astro compiles every
`<style>` block as its own unit. While the styles lived in the components, Navbar
could never share a rule with Footer — no matter how the base was written.

Two earlier shapes were tried and rejected:

- **A mixin.** Works from a scoped block, but copies the declarations into every
  component. No shared rule, ever.
- **A placeholder (`%container`).** Also works from a scoped block, but a
  placeholder emits nothing, so each component still got its own private copy —
  and no `.fa-container` exists for anything else to extend.
- **A real class, from a scoped block.** Compiles, but Astro scopes the generated
  selector too: `.fa-container[data-astro-cid-l7arcky5]`. That is not a shared
  base class, it is a per-component duplicate wearing the name of one.

Moving the styles out costs Astro's automatic scoping, which is no loss here:
every class already carries the project prefix via `cls()`, which
[decisions.md](decisions.md) notes was kept deliberately even though Astro was
scoping on top of it.

One syntax note: `@extend .#{$prefix}-container` interpolates fine, so the
prefix rule still holds — no class is ever written as a literal.

## Two axes, two base classes

The split is deliberate: `container` owns horizontal bounds, `section` owns
vertical rhythm. Nothing owns both, so a full-bleed background with inset content
is just an element extending one wrapping an element extending the other.

| Base class | Controls |
|---|---|
| `.#{$prefix}-container` | `max-width` + `padding-inline`, with one breakpoint |
| `.#{$prefix}-section` | `padding-block: var(--section-y)` |

### Container inset

The container switches once, at `$bp-sm` (768px). Below it there is no
`max-width` at all — the viewport is already narrower than the cap.

| | below 768px | from 768px |
|---|---|---|
| base | `2rem` | `12rem`, capped at `--container-max` (1600px) |
| `.-sm` | `1rem` | `12rem` |
| `.-lg` | `1.5rem` | `24rem` |

Two things about this table are worth saying out loud, because they look like
mistakes and are not:

- **`.-sm` only differs on mobile.** From 768px up it is identical to the base.
- **The ordering flips.** On mobile the base is the *widest* inset (2rem) and
  `.-lg` sits between it and `.-sm`; from 768px up `.-lg` is the widest. The
  modifier names describe the inset, not the content width, and the two scales
  were tuned independently.

Both are inherited from the reference implementation this was matched against.
Change them in `_tokens.scss` if this project wants something more regular.

## Why two spacing scales

`--space-*` is a static step scale (0.25rem → 12rem) for component-level gaps and
margins. It does not scale with the viewport, because a 4px gap between a label
and its value is 4px at every width — making it fluid only adds jitter.

`--section-y*` is `clamp()`-based, because vertical rhythm genuinely should
breathe: 4rem of section padding that reads generous on a phone reads cramped on
a 27" display. It is the only fluid spacing token; reach for a `--space-*` step
everywhere else.

The container inset is deliberately **not** fluid. It was, briefly
(`clamp(1.25rem, 4vw, 2.5rem)`), and that is the more obvious choice — but a
single hard switch at 768px is what produces the look this was matched against:
a phone-tight 2rem that becomes a dramatic 12rem the moment there is room for it.
A clamp cannot do that; it would spend the whole range easing between the two and
never commit to either.

Breakpoints live in `_breakpoints.scss` as SCSS variables, not custom properties,
because a media query cannot read `var()`. The full ladder is in [responsive.md](responsive.md).

## Type

`--text-xs` → `--text-lg` are fixed; `--text-xl` and up are fluid, because that
is where a fixed rem value starts overflowing narrow screens. The clamps were
lifted from what the sections already used, so the scale describes the existing
design rather than replacing it — `--text-display` is Hero's
`clamp(3rem, 12vw, 11rem)` verbatim.

`--measure-*` are in `ch`, not rem: line length is a function of the font, and
`ch` tracks it when the typeface changes. Headings that should wrap early use
`--measure-display` / `--measure-heading`; body copy uses `--measure-body`.

Line height and tracking ship as paired scales (`--leading-*`, `--tracking-*`)
because at display sizes they are not independent — tight tracking at
`--leading-normal` reads loose, and the pairing keeps that from drifting per
section.

## What is not migrated yet

Only `Navbar` extends a base class. The sections still carry hardcoded values
(`padding: 8rem 1.5rem`, `max-width: 18ch`).

Migrating them is **not** visually neutral any more. The type and section-rhythm
tokens were lifted from the sections' own numbers, so those stay put — but the
container inset now comes from a different design: a section on `1.5rem` jumps to
`12rem` from 768px up. Expect the layout to change when a section adopts it, and
check it at 767px and 768px.

Until then, content will not line up with the navbar on wide screens: the navbar
stops at `--container-max` with a 12rem inset, the sections still run full bleed.
