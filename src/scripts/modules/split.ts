import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// See docs/text-reveal.md before changing this.

// A line mask clips at the line box, and descenders (g, y, p) hang below it.
// Give the mask that much extra room, then pull it back so layout is unchanged.
const DESCENDER = '0.22em';
// Far enough that the glyphs still start below the now-taller clip edge.
const START_Y = 135;

let splits: SplitText[] = [];

export function initSplit() {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    const perLine = el.dataset.split === 'lines';

    splits.push(
      SplitText.create(el, {
        type: perLine ? 'lines' : 'lines,words,chars',
        mask: 'lines',
        autoSplit: true,
        aria: 'auto',
        onSplit(self) {
          gsap.set(self.masks, {
            paddingBottom: DESCENDER,
            marginBottom: `-${DESCENDER}`,
          });

          return gsap.from(perLine ? self.lines : self.chars, {
            yPercent: START_Y,
            rotate: perLine ? 0 : 4,
            duration: perLine ? 1 : 1.1,
            ease: 'expo.out',
            stagger: perLine ? 0.12 : { amount: 0.45, from: 'start' },
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              once: true,
            },
          });
        },
      }),
    );
  });
}

export function destroySplit() {
  splits.forEach((split) => split.revert());
  splits = [];
}
