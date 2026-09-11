<!-- part of docs/ — see docs/README.md for the index -->

# Cursor

Cuberto's [`mouse-follower`](https://github.com/Cuberto/mouse-follower) drives the
cursor. It is a persistent singleton created once in `boot()` via
`initCursor()` in `src/scripts/core/cursor.ts`.

## Which package

The official `mouse-follower`, not the `@gwlab/mouse-follower` TypeScript fork.
The fork existed because the original went untyped and unmaintained; that is no
longer true. At the time of writing the original is 1.2.1, last published
2026-08-31, and ships its own `index.d.ts` — while the fork sits at 0.1.7, last
touched 2024. The advice to prefer the fork is stale; check both before repeating
it.

## It needs a host element, or it dies on navigation

Left alone, MouseFollower appends its element to `<body>`. The router discards
that on the first navigation, and the GSAP setters keep writing to the detached
node — the cursor freezes with no error.

So `Cursor.astro` renders an empty `<div class={cls('cursor')} transition:persist>`
and `initCursor()` passes it in as the `el` option. MouseFollower reuses an
existing element when given one and builds its inner parts inside it. Same class
of bug as everything in [swap-gotchas.md](swap-gotchas.md).

## Every class obeys the prefix

MouseFollower exposes each of its class names as an option, so `initCursor()`
feeds them all from `cls()`: the host is `<prefix>-cursor`, and the nodes it
builds at runtime become `<prefix>-cursor__inner`, `__text`, `__media`,
`__media-box`, `__icon`. The `<html>` flag is `<prefix>-has-cursor`.

The cost is that the **library's stylesheet is not imported** — it targets
`.mf-cursor` by name and would stop matching. `src/styles/_cursor.scss` is a port
of it (all ~2 KB, faithful) with the selectors interpolated from `$prefix`.

Two consequences worth knowing:

- **Those rules are global, not scoped.** MouseFollower creates the inner nodes
  at runtime, and Astro's scoped styles only reach elements that exist in the
  template — a scoped block would never match them.
- **The port is a fork.** If the library changes its CSS, nothing here tells you.
  Re-diff `node_modules/mouse-follower/dist/mouse-follower.min.css` against
  `_cursor.scss` when upgrading.

## The `data-cursor` convention is native

MouseFollower's `dataAttr` option defaults to `'cursor'`, and it reads
`dataset[dataAttr]` — which is exactly `data-cursor`. The scaffold's existing
convention needed no glue at all. The attribute *value* is used directly as a
state class name, so the vocabulary is now the library's:

| Markup | Effect |
|---|---|
| *(nothing on `a` / `button`)* | `-pointer`, automatic via the default `stateDetection` |
| `data-cursor="-inverse"` | white dot — put it on dark sections |
| `data-cursor="-exclusion"` | `mix-blend-mode: exclusion`, readable on anything |
| `data-cursor-text="View"` | dot grows and shows the text |
| `data-cursor-img="…"` / `-video` / `-icon` | media modes |
| `data-cursor-stick` | sticks to the element |

Don't put `data-cursor` on links and buttons — `stateDetection` already covers
`a,button`, and the attribute just duplicates it.

## Colour is not set by the library

The dot is `<prefix>-cursor::before` painted with `background: currentColor`, and
the original stylesheet never sets a colour — it inherits. The port pins
`color: var(--fg)` so it doesn't depend on what it happens to inherit from
`body`.

`--fg` is the *root* value: a section that flips `--bg`/`--fg` locally cannot
affect a `position: fixed` element outside it, so the dark Showcase carries
`data-cursor="-inverse"` to turn the dot white. Any dark section needs that, or
`-exclusion`.

## Hiding the native cursor

`initCursor()` adds `<prefix>-has-cursor` to `<html>` **only when MouseFollower actually
starts**, and `_cursor.scss` hides the native cursor only under that class. So a
coarse pointer or a reduced-motion visitor — where the follower never
initialises — keeps a working system cursor instead of none at all.

That class is runtime state on `<html>`, which the router wipes on swap; it
survives because of `restoreHtmlClasses()`. See [swap-gotchas.md](swap-gotchas.md).

## State does not survive a page swap — on purpose

MouseFollower clears a state on `mouseout`, and an element removed by a page swap
never sends one. Hover a tile carrying `data-cursor-text="View"`, click through,
and without help the cursor lands on the next page still wearing `-pointer
-text` and still reading "View" — on a page that has no such element, so nothing
can ever clear it.

`resetCursor()` undoes text, icon, media and stick, then sweeps whatever state
classes remain. It sweeps rather than naming
them so that project-specific states go too; `-hidden` is the one exclusion,
because `removeState('-hidden')` is `show()` in disguise.

It also blanks the text node. `removeText()` only drops the state class and
leaves the old string in the DOM, so an element asking for `-text` without
supplying text of its own would display the previous page's — verified, then
fixed.

### It runs on `after-swap`, and the order matters

`transition:persist` does not leave the cursor node alone — it re-inserts it into
the new document, and **re-insertion cancels any CSS transition in flight**. Reset
before or during the swap and the state snaps to its end value with nothing to
see; the easing is thrown away mid-flight.

Running it once the node has landed in the new DOM lets the transition play out
untouched. Measured across a real navigation, sampling every 40ms:

```
t=161  dot 1.65   text 0.93   "View"
t=243  dot 1.04   text 0.50   "View"
t=322  dot 0.42   text 0.24   "View"
t=402  dot 0.20   text 0.08   "View"
t=562  dot 0.20   text 0      ""
```

The dot eases 1.7 → 0.2 in ~240ms (the stylesheet says 0.25s) and the text fades
over ~400ms (0.4s) with its glyphs still in place, so they actually fade rather
than vanish. Emptying the text node is deferred by `TEXT_FADE_MS` for exactly
that reason, and skipped if something has claimed `-text` again in the meantime.

An earlier attempt reset on `before-preparation`, reasoning that the overlay
would otherwise hide it. That was wrong twice over: the overlay barely reaches
0.09 opacity on a fast navigation, and resetting that early is precisely what the
re-insertion cancels.

One deliberate gap: right after a navigation the cursor is in its default state
even if the pointer is still resting on a link, because no `mouseover` fires
until the pointer moves. One pixel of movement restores `-pointer`.

## Not a bug

The cursor carries `-hidden` until the first `mousemove`. That is by design — it
avoids parking a dot at 0,0 before the visitor has moved the mouse.
