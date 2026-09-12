<!-- part of docs/ — see docs/README.md for the index -->

# Breakpoints and visibility

Breakpoints live in `src/styles/_breakpoints.scss` as SCSS variables, not custom
properties, because a media query cannot read `var()`.

| | |
|---|---|
| `$bp-sm` | 768px |
| `$bp-md` | 1024px |
| `$bp-lg` | 1200px |
| `$bp-xl` | 1600px |
| `$bp-xxl` | 1920px |

`$bp-sm` is the one that carries weight: it is the single switch the container
inset uses (see [spacing.md](spacing.md)). The rest exist only for the visibility
utilities.

## Visibility utilities

Two families, generated from the ladder in `_visibility.scss`:

- **`-l<bp>`** — *less than*. Hidden from that breakpoint **up**; visible below it.
- **`-g<bp>`** — *greater than*. Hidden **below** the next breakpoint; visible from
  it up.

| Class | Hidden when | Class | Hidden when |
|---|---|---|---|
| `-lsm` | ≥ 768 | `-gxs` | ≤ 767 |
| `-lmd` | ≥ 1024 | `-gsm` | ≤ 1023 |
| `-llg` | ≥ 1200 | `-gmd` | ≤ 1199 |
| `-lxl` | ≥ 1600 | `-glg` | ≤ 1599 |
| | | `-gxl` | ≤ 1919 |

The two families read off the ladder from opposite ends, which is why the names
are offset: `-lsm` and `-gxs` are the same 768px boundary seen from either side.

These are the only classes in the project written as literals. That is consistent
with the prefix rule rather than an exception to it — they are `-modifier` states,
like `-inverse` and `-pointer`.

## Two things to know before using them

**They can lose a specificity fight.** `display: none` here carries one class of
specificity and no `!important`. A component rule like `.fa-navbar__nav a` (two
classes plus an element) sets `display` and wins. `_visibility.scss` is loaded
last in `main.scss` so it beats equal-specificity rules, but that is all it does.

**They hide, they do not unload.** The element is still in the DOM, still parsed,
and any image inside it is still fetched. For a heavy block, render it
conditionally in the `.astro` file instead.

## Where this ladder came from

It was matched against a reference implementation, and reproduces eight of its
nine utilities exactly. The one deviation is `-glg`: the reference hides it at
≤ 1349, implying a 1350px breakpoint that nothing else in its stylesheet uses,
while its `-llg` sits at 1200 and its `-lxl` at 1600. Following it literally would
have meant carrying a sixth breakpoint for a single utility, so `-glg` uses
`$bp-xl` (≤ 1599) and the ladder stays internally consistent.
