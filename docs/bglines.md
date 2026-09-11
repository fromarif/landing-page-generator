<!-- part of docs/ — see docs/README.md for the index -->

# Background lines

`modules/bglines.ts` draws a field of lines that bow while the page is moving and
settle straight when it stops. Adapted from Cuberto's
[`bglines`](https://github.com/Cuberto/bglines) — but not ported, because that
repo does not ship a working effect.

```astro
<Lines heading="…" color="0.05,0.05,0.05,0.18" lines={20} bend={90} />
```

## The repo is missing the half that matters

Its shader has two parts. The first nudges `pos.x`:

```glsl
pos.x += mix(func1, func2, (pos.x + 10.) / 20. * sin(time * speed));
```

That is **linear in x**, so a horizontal line stays a horizontal line — it is
stretched and shifted, nothing more. The part that would actually bend the lines
is the second:

```glsl
vec4 rgba = texture2D(data, vec2(.5, coordY));
pos.y += rgba.r * 1000. * k2;
```

`data` is a `WebGLRenderTarget` that is created, sampled — and **never rendered
into**. `setRenderTarget` does not appear anywhere in the source. So `rgba.r` is
0, the displacement is 0, and the published demo draws near-static horizontal
lines.

This was checked, not assumed: the shader was ported to raw WebGL and run. Twenty
flat lines, no motion worth the name.

`coordY` is derived from `scroll` **and** `pos.x`, and `k2` peaks at screen
centre — the shape of an effect where lines bend around page content. Whatever
filled that texture was not published.

## What replaced it

A procedural wave, with its amplitude driven by scroll speed:

```glsl
pos.y += sin(coordY * 24. + t) * bend * k2;
```

`bend` is eased toward `min(|scrollVelocity| / 2000, 1) * bendMax`, so the lines
are straight at rest and bowed while the page moves. Their `coordY` and `k2` are
kept, so the wave still travels along the line and peaks where theirs would have.

## No Three.js

The original pulls in Three.js for an orthographic camera, a `ShaderMaterial` and
`THREE.Line`. That is ~150 KB gzipped for a 20-line shader and some line strips,
against a project whose stated hard requirement is speed — and the demo's
`THREE.Geometry` has been removed from Three.js since r128 anyway, so it would
need porting to `BufferGeometry` before it ran at all.

Raw WebGL does the same job in about eighty lines: one program, one static vertex
buffer, and a hand-built orthographic matrix.

## Lifecycle

The original has no teardown at all — a `requestAnimationFrame` loop that never
stops, a `resize` listener that is never removed, and a WebGL context that is
never released. Browsers cap live contexts at roughly sixteen, so under a
client-side router that site breaks after enough navigations.

Here `destroyBgLines()` cancels the frame, disconnects the observer, removes the
listener and calls `WEBGL_lose_context`. Verified by holding a reference to the
context across a navigation: `isContextLost()` flips to `true`, and returning to
the page builds a fresh one.

It also pauses when off screen — an IntersectionObserver stops the loop entirely
rather than rendering a background nobody is looking at.

## Reduced motion

One static frame is drawn and the loop never starts, so the lines are there as
texture without any movement.

## Tuning it

The effect is deliberately near-invisible at the defaults — `alpha: 0.18` over
the page background. To see what a change actually does, raise the alpha and
`bend` temporarily (`color="0.05,0.05,0.05,0.7" bend={420}`), tune, then put them
back. That is how the scroll response above was verified: obviously wavy during a
scroll, straight three seconds later.
