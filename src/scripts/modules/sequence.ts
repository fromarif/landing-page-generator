import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { expectAssets, assetSettled } from '../core/progress';

// See docs/scroll-sequence.md before changing this.

type Instance = { destroy: () => void };

let instances: Instance[] = [];

const START = 'top bottom';
const PIN_SCREENS = 2;

const endFor = (pinScreens: number) =>
  pinScreens ? `+=${(pinScreens + 2) * 100}%` : 'bottom top';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initSequence() {
  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll<HTMLElement>('[data-sequence]').forEach((container) => {
    const canvas = container.querySelector('canvas');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const count = Number(container.dataset.sequenceCount ?? 0);
    const base = container.dataset.sequenceSrc ?? '';
    if (!count || !base) return;

    const frames: Array<HTMLImageElement | undefined> = new Array(count);
    let alive = true;
    let current = 0;

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };

    const draw = (index: number) => {
      let img = frames[index];
      for (let step = 1; !img && step < count; step++) {
        img = frames[index - step] ?? frames[index + step];
      }
      if (!img) return;

      current = index;
      const cw = canvas.width;
      const ch = canvas.height;
      const ratio = img.width / img.height;
      const cover = ratio > cw / ch;
      const w = cover ? ch * ratio : cw;
      const h = cover ? ch : cw / ratio;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    };

    const load = (report = false) => {
      for (let i = 0; i < count; i++) {
        const img = new Image();
        img.src = `${base}${String(i + 1).padStart(3, '0')}.webp`;
        img
          .decode()
          .then(() => {
            if (!alive) return;
            frames[i] = img;
            if (i <= current + 1) draw(current);
          })
          .catch(() => {})
          .finally(() => {
            if (report) assetSettled();
          });
      }
    };

    const onResize = () => {
      sizeCanvas();
      draw(current);
    };
    window.addEventListener('resize', onResize);
    sizeCanvas();

    if (reduced()) {
      load();
      instances.push({
        destroy() {
          alive = false;
          window.removeEventListener('resize', onResize);
        },
      });
      return;
    }

    const gateLoader = container.dataset.sequencePreload === 'loader';
    if (gateLoader) expectAssets(count);

    const preload = gateLoader
      ? null
      : ScrollTrigger.create({
          trigger: container,
          start: 'top bottom+=100%',
          once: true,
          onEnter: () => load(),
        });

    if (gateLoader) load(true);

    const pinScreens = Number(container.dataset.sequencePin ?? PIN_SCREENS);

    const pin = pinScreens
      ? ScrollTrigger.create({
          trigger: container,
          start: 'top top',
          end: `+=${pinScreens * 100}%`,
          pin: true,
        })
      : null;

    const state = { i: 0 };
    const scrub = gsap.to(state, {
      i: count - 1,
      roundProps: 'i',
      ease: 'none',
      onUpdate: () => draw(state.i),
      scrollTrigger: {
        trigger: container,
        start: container.dataset.sequenceStart || START,
        end: container.dataset.sequenceEnd || endFor(pinScreens),
        scrub: true,
      },
    });

    instances.push({
      destroy() {
        alive = false;
        window.removeEventListener('resize', onResize);
        preload?.kill();
        pin?.kill();
        scrub.scrollTrigger?.kill();
        scrub.kill();
      },
    });
  });
}

export function destroySequence() {
  instances.forEach((instance) => instance.destroy());
  instances = [];
}
