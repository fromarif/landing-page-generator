# docs

Why the engine is built the way it is. Kept out of the source so the code stays
comment-free — if you're about to "simplify" something in `src/scripts/core/*`,
`src/scripts/app.ts` or `astro.config.ts`, read the relevant page first.

Every claim here was verified by measuring a running dev server, not by reading
the code. Where something is unverified, it says so.

| Page | Read it before |
|---|---|
| [lifecycle.md](lifecycle.md) | touching `app.ts`, or adding any module that builds DOM |
| [swap-gotchas.md](swap-gotchas.md) | removing anything that runs on `astro:after-swap` |
| [prefix.md](prefix.md) | changing how engine class names are produced |
| [cursor.md](cursor.md) | touching the cursor, or adding `data-cursor` hooks |
| [marquee.md](marquee.md) | adding any module that owns observers or timelines |
| [blob.md](blob.md) | touching the video knockout, or swapping its asset |
| [text-reveal.md](text-reveal.md) | touching `data-split`, or adding type animation |
| [scroll-sequence.md](scroll-sequence.md) | touching the canvas sequence, or its frames |
| [loader-gating.md](loader-gating.md) | making the intro overlay wait for assets |
| [bglines.md](bglines.md) | touching the WebGL line background |
| [magnetic.md](magnetic.md) | adding `data-magnetic`, or pairing it with the cursor |
| [jelly.md](jelly.md) | adding `data-jelly`, or combining skew with other transforms |
| [decisions.md](decisions.md) | undoing something that looks redundant |
| [verification.md](verification.md) | claiming any of this is tested |

## Adding to these docs

One page per topic, and keep them short. When a page starts covering two
unrelated things, split it rather than letting it grow — that's why this is a
folder and not one file.

Code files get at most a one-line pointer (`// See docs/prefix.md before changing
this.`), never the explanation itself.
