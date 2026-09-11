import Lenis from 'lenis';

let instance: Lenis | null = null;

export function initLenis(lerp = 0.1): Lenis {
  if (instance) return instance;
  instance = new Lenis({ lerp, smoothWheel: true });
  return instance;
}

export function getLenis(): Lenis | null {
  return instance;
}
