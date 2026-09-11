import gsap from 'gsap';
import MouseFollower from 'mouse-follower';
import { cls, sel } from './names';

// See docs/cursor.md before changing this.

let instance: MouseFollower | null = null;
let pendingTextClear: number | undefined;

// Matches the text fade in _cursor.scss.
const TEXT_FADE_MS = 400;

export function initCursor(): MouseFollower | null {
  if (instance) return instance;

  const host = document.querySelector<HTMLElement>(sel('cursor'));
  if (!host) return null;

  const fine = window.matchMedia('(pointer: fine)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduced) {
    host.style.display = 'none';
    return null;
  }

  MouseFollower.registerGSAP(gsap);
  instance = new MouseFollower({
    el: host,
    className: cls('cursor'),
    innerClassName: cls('cursor', 'inner'),
    textClassName: cls('cursor', 'text'),
    mediaClassName: cls('cursor', 'media'),
    mediaBoxClassName: cls('cursor', 'media-box'),
    iconImgClassName: cls('cursor', 'icon'),
    iconSvgClassName: cls('cursor', 'svgsprite'),
  });

  document.documentElement.classList.add(cls('has-cursor'));
  return instance;
}

export function getCursor(): MouseFollower | null {
  return instance;
}

export function resetCursor(): void {
  if (!instance) return;

  instance.removeText();
  instance.removeIcon();
  instance.removeMedia();
  instance.removeStick();

  const textState = instance.options.textState ?? '-text';
  clearTimeout(pendingTextClear);
  pendingTextClear = window.setTimeout(() => {
    if (instance && !instance.el.classList.contains(textState)) {
      instance.text.textContent = '';
    }
  }, TEXT_FADE_MS);

  const base = cls('cursor');
  const stale = [...instance.el.classList].filter(
    (name) => name !== base && name !== '-hidden',
  );
  if (stale.length) instance.removeState(stale.join(' '));
}
