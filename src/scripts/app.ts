import { site } from '../config/site';
import { initLenis, getLenis } from './core/lenis';
import { wireScroll, refreshScroll, killPageTriggers } from './core/scroll';
import { initCursor, resetCursor } from './core/cursor';
import { showOverlay, hideOverlay, setOverlayProgress } from './core/transition';
import { assetsPending, assetRatio, onAssetProgress, whenAssetsSettled } from './core/progress';
import { initReveal } from './modules/reveal';
import { initReeller, destroyReeller } from './modules/reeller';
import { initSplit, destroySplit } from './modules/split';
import { initMagnetic, destroyMagnetic } from './modules/magnetic';
import { initJelly, destroyJelly } from './modules/jelly';
import { initSequence, destroySequence } from './modules/sequence';
import { initBgLines, destroyBgLines } from './modules/bglines';

// Read docs/lifecycle.md and docs/swap-gotchas.md before editing this file.

const reduced = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let booted = false;
let firstLoad = true;
let htmlClasses: string[] = [];

export function boot() {
  if (booted) return;
  booted = true;

  if (!reduced()) {
    initLenis(site.motion.lerp);
    wireScroll();
  }
  if (site.motion.cursor) initCursor();

  document.addEventListener('astro:page-load', onPageLoad);
  document.addEventListener('astro:before-swap', onBeforeSwap);
  document.addEventListener('astro:before-preparation', () => showOverlay());
  document.addEventListener('astro:after-swap', () => {
    restoreHtmlClasses();
    syncLenisToDocument();
    resetCursor();
    hideOverlay();
  });
}

function onPageLoad() {
  if (!reduced()) {
    initReveal(); // register your section modules here
    initSplit();
    initReeller();
    initMagnetic();
    initJelly();
    playAutoplayVideo();
    refreshScroll();
  } else {
    document
      .querySelectorAll<HTMLElement>('[data-reveal]')
      .forEach((el) => (el.style.opacity = '1'));
    document
      .querySelectorAll<HTMLVideoElement>('video[autoplay]')
      .forEach((video) => video.pause());
  }

  initSequence();
  initBgLines();

  if (firstLoad) {
    firstLoad = false;

    if (assetsPending()) {
      setOverlayProgress(assetRatio());
      const off = onAssetProgress(setOverlayProgress);
      void whenAssetsSettled().then(() => {
        off();
        hideOverlay();
      });
    } else {
      hideOverlay();
    }
  }
}

function playAutoplayVideo() {
  document
    .querySelectorAll<HTMLVideoElement>('video[autoplay]')
    .forEach((video) => void video.play().catch(() => {}));
}

function onBeforeSwap() {
  killPageTriggers();
  destroyReeller();
  destroySplit();
  destroyMagnetic();
  destroyJelly();
  destroySequence();
  destroyBgLines();
  rememberHtmlClasses();
}

function rememberHtmlClasses() {
  htmlClasses = [...document.documentElement.classList];
}

function restoreHtmlClasses() {
  if (htmlClasses.length) document.documentElement.classList.add(...htmlClasses);
}

function syncLenisToDocument() {
  getLenis()?.scrollTo(window.scrollY, { immediate: true, force: true });
}
