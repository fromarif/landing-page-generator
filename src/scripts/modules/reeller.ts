import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Reeller from 'reeller';
import { sel } from '../core/names';

// See docs/marquee.md before changing this.
const VELOCITY_DIVISOR = 600;
const MAX_BOOST = 5;
const SETTLE_DELAY = 0.25;
const RAMP = 0.3;

let instances: Reeller[] = [];
let cleanups: Array<() => void> = [];

export function initReeller() {
  Reeller.registerGSAP(gsap);
  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll<HTMLElement>('[data-marquee]').forEach((container) => {
    const wrapper = container.querySelector<HTMLElement>(sel('marquee', 'track'));
    if (!wrapper) return;

    const instance = new Reeller({
      container,
      wrapper,
      itemSelector: sel('marquee', 'item'),
      speed: Number(container.dataset.marqueeSpeed ?? 10),
      reversed: container.dataset.marqueeReverse !== undefined,
    });
    instances.push(instance);

    if (container.dataset.marqueeVelocity === 'off') return;

    const setTimeScale = gsap.quickTo(instance.tl, 'timeScale', {
      duration: RAMP,
      ease: 'power2.out',
    });
    let direction = 1;
    let settle: gsap.core.Tween | undefined;

    cleanups.push(() => {
      settle?.kill();
      gsap.killTweensOf(instance.tl);
    });

    ScrollTrigger.create({
      trigger: container,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const velocity = self.getVelocity();
        if (velocity !== 0) direction = velocity > 0 ? 1 : -1;

        const boost = Math.min(Math.abs(velocity) / VELOCITY_DIVISOR, MAX_BOOST);
        setTimeScale(direction * (1 + boost));

        settle?.kill();
        settle = gsap.delayedCall(SETTLE_DELAY, () => setTimeScale(direction));
      },
    });
  });
}

export function destroyReeller() {
  cleanups.forEach((cleanup) => cleanup());
  cleanups = [];
  instances.forEach((instance) => instance.destroy(true, true));
  instances = [];
}
