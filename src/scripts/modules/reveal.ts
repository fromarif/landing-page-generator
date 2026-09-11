import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Template for page-scoped modules: build here, register in app.ts onPageLoad().
export function initReveal() {
  gsap.registerPlugin(ScrollTrigger);

  const items = gsap.utils.toArray<HTMLElement>('[data-reveal]');
  items.forEach((el) => {
    gsap.from(el, {
      y: 40,
      autoAlpha: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });
}
