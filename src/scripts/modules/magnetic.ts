import gsap from 'gsap';

// See docs/magnetic.md before changing this.

type Options = { x: number; y: number; s: number; rs: number };

const DEFAULTS: Options = { x: 0.2, y: 0.2, s: 0.2, rs: 0.7 };

let cleanups: Array<() => void> = [];

function options(el: HTMLElement): Options {
  const raw = el.dataset.magnetic?.trim();
  if (!raw) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Options>) };
  } catch {
    return DEFAULTS;
  }
}

function offset(el: HTMLElement, axis: 'x' | 'y'): number {
  return parseFloat(String(gsap.getProperty(el, axis))) || 0;
}

export function initMagnetic(): void {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const o = options(el);
    let cx = 0;
    let cy = 0;

    const measure = () => {
      const r = el.getBoundingClientRect();
      cx = r.left - offset(el, 'x') + r.width / 2;
      cy = r.top - offset(el, 'y') + r.height / 2;
    };

    const enter = () => {
      measure();
      window.addEventListener('scroll', measure, { passive: true });
    };

    const move = (e: PointerEvent) => {
      gsap.to(el, {
        x: (e.clientX - cx) * o.x,
        y: (e.clientY - cy) * o.y,
        duration: o.s,
        force3D: true,
        overwrite: true,
      });
    };

    const leave = () => {
      window.removeEventListener('scroll', measure);
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: o.rs,
        ease: 'back.out(1.8)',
        force3D: true,
        overwrite: true,
      });
    };

    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);

    cleanups.push(() => {
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      window.removeEventListener('scroll', measure);
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: 'transform' });
    });
  });
}

export function destroyMagnetic(): void {
  cleanups.forEach((fn) => fn());
  cleanups = [];
}
