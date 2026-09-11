import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getLenis } from './lenis';

let wired = false;

export function wireScroll() {
  if (wired) return;
  gsap.registerPlugin(ScrollTrigger);

  const lenis = getLenis();
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  wired = true;
}

export function refreshScroll() {
  ScrollTrigger.refresh();
}

// Kills every trigger, by design — see docs/decisions.md.
export function killPageTriggers() {
  ScrollTrigger.getAll().forEach((t) => t.kill());
}
