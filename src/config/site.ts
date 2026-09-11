// Per-project config. First thing you edit on a new build.
export const site = {
  name: 'Studio',

  // Plain string literal only — see docs/prefix.md.
  prefix: 'fa',

  nav: [
    { label: 'Work', href: '/' },
    { label: 'About', href: '/about/' },
  ],

  motion: {
    lerp: 0.1, // lower = smoother/heavier, higher = snappier
    cursor: true,
  },
} as const;
