<!-- part of docs/ — see docs/README.md for the index -->

# Video knockout

`sections/Blob.astro` is the transparentize-video technique: a black-and-white
video with its black knocked out by `mix-blend-mode`, tinted to any colour. An
organic moving shape with no alpha channel, no WebGL and no canvas.

## How the two blends compose

```
section        dark background
  media        isolation: isolate
    video      mix-blend-mode: screen     → keeps white, drops black
    tint       mix-blend-mode: multiply   → paints the surviving white
```

`screen` is `1-(1-a)(1-b)`: a black pixel leaves the backdrop untouched, so the
video's black field becomes the section background and the rectangle disappears.
`multiply` on top then colours whatever white survived, leaving the dark areas
dark.

**`isolation: isolate` is load-bearing.** Without it `screen` blends against
everything painted behind the section, not against the section's own background,
and the effect bleeds up the page. Verified: the neighbouring hero and showcase
stay `rgb(244,244,244)` with `mix-blend-mode: normal`.

The section sets `--bg`/`--fg` locally the same way `Showcase` does for its
`-inverse` variant, and carries `data-cursor="-inverse"` so the cursor stays
visible against it.

## The demo asset is generated, and disposable

`public/video/blob.mp4` is 41 KB, 640×360, 6s, generated with ffmpeg — three
metaballs summed in a `geq` expression, blurred, in grayscale. Every motion
frequency is an integer multiple of the 6s duration, so it loops seamlessly.

It exists so the section works out of the box. Replace it per project; the only
contract is **black background, white shape**. Pass `src` and `tint` as props.

Keep any replacement small. A full-bleed autoplaying video works directly against
the project's "fast" requirement, and this technique does not need resolution —
the shape is blurred by design.

## Reduced motion

Autoplaying video is motion. The reduced branch of `onPageLoad()` pauses every
`video[autoplay]`, and the section drops the video's opacity. Code path reviewed,
not exercised at runtime — see [verification.md](verification.md).
