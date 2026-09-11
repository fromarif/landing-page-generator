import gsap from 'gsap';
import { sel } from './names';

// Extension point: swap these for a full GSAP timeline (or drop ClientRouter
// for Barba/Taxi) when fades stop being enough. docs/decisions.md.

export async function showOverlay(): Promise<void> {
  const o = document.querySelector<HTMLElement>(sel('loader'));
  if (!o) return;
  o.style.pointerEvents = 'auto';
  await gsap.to(o, { autoAlpha: 1, duration: 0.35, ease: 'power2.inOut' });
}

export async function hideOverlay(): Promise<void> {
  const o = document.querySelector<HTMLElement>(sel('loader'));
  if (!o) return;
  await gsap.to(o, { autoAlpha: 0, duration: 0.35, ease: 'power2.inOut' });
  o.style.pointerEvents = 'none';
}

export function setOverlayProgress(ratio: number): void {
  const el = document.querySelector<HTMLElement>(sel('loader', 'count'));
  if (el) el.textContent = `${Math.round(ratio * 100)}`;
}
