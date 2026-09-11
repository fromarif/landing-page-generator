import gsap from 'gsap';

// See docs/jelly.md before changing this.

type Options = { intensity: number; min: number; max: number };
type Item = {
  el: HTMLElement;
  o: Options;
  set: (value: number) => void;
  visible: boolean;
  skew: number;
};

const DEFAULTS: Options = { intensity: 0.15, min: -5, max: 5 };
const FRAME = 1000 / 60;

let items: Item[] = [];
let observer: IntersectionObserver | null = null;
let tick: gsap.TickerCallback | null = null;
let last = 0;

function options(el: HTMLElement): Options {
  const raw = el.dataset.jelly?.trim();
  if (!raw) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Options>) };
  } catch {
    return DEFAULTS;
  }
}

export function initJelly(): void {
  const els = [...document.querySelectorAll<HTMLElement>('[data-jelly]')];
  if (!els.length) return;

  items = els.map((el) => ({
    el,
    o: options(el),
    set: gsap.quickSetter(el, 'skewY', 'deg') as (value: number) => void,
    visible: false,
    skew: 0,
  }));

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const item = items.find((i) => i.el === entry.target);
      if (!item) return;
      item.visible = entry.isIntersecting;
      if (!entry.isIntersecting && item.skew !== 0) {
        item.skew = 0;
        item.set(0);
      }
    });
  });
  items.forEach((item) => observer?.observe(item.el));

  last = window.scrollY;
  tick = (_time, delta) => {
    const y = window.scrollY;
    const diff = y - last;
    last = y;
    if (!delta) return;

    const scale = FRAME / delta;
    items.forEach((item) => {
      if (!item.visible) return;
      const next = gsap.utils.clamp(
        item.o.min,
        item.o.max,
        diff * item.o.intensity * scale,
      );
      if (next === item.skew) return;
      item.skew = next;
      item.set(next);
    });
  };
  gsap.ticker.add(tick);
}

export function destroyJelly(): void {
  if (tick) gsap.ticker.remove(tick);
  tick = null;
  observer?.disconnect();
  observer = null;
  items.forEach((item) => gsap.set(item.el, { clearProps: 'transform' }));
  items = [];
}
