// ─────────────────────────────────────────────────────────────
// Nick Technology — Motion System (GSAP + ScrollTrigger)
// Load order (all deferred): gsap.min.js → ScrollTrigger.min.js → motion.js
// Falls back to the IntersectionObserver reveals in script.js when
// GSAP is unavailable, and to gentle opacity fades under reduced motion.
// Append ?motion=full to the URL to preview full motion regardless of
// the OS "reduce motion" setting.
// ─────────────────────────────────────────────────────────────
(() => {
  const forceFull = /[?&]motion=full/.test(location.search);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches && !forceFull;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const REVEAL_SEL = '.reveal, .reveal-left, .reveal-scale, .reveal-bounce';

  const showAllReveals = () => {
    document.querySelectorAll(REVEAL_SEL).forEach(el => el.classList.add('visible'));
  };

  // Failsafe: if the animation clock is unhealthy (occluded window,
  // heavily throttled rAF, aggressive battery saver), never leave content
  // invisible — snap everything to its final state.
  let frames = 0;
  const countFrame = () => { frames++; if (frames < 240) requestAnimationFrame(countFrame); };
  requestAnimationFrame(countFrame);
  setTimeout(() => {
    if (frames > 60) return; // healthy clock, animations are running fine
    if (typeof window.gsap !== 'undefined') {
      try {
        gsap.globalTimeline.getChildren(true, true, false).forEach(t => t.totalProgress(1));
      } catch (e) {}
    }
    document.querySelectorAll(REVEAL_SEL).forEach(el => {
      el.style.transition = 'none';
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.filter = 'none';
      el.classList.add('visible');
    });
    document.querySelectorAll('[data-hero-stagger]').forEach(col => {
      Array.from(col.children).forEach(ch => {
        ch.style.opacity = '';
        ch.style.transform = '';
      });
    });
  }, 3500);

  if (reduced) {
    // Reduce, don't remove: content fades in via CSS, no movement.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showAllReveals);
    } else {
      showAllReveals();
    }
    return;
  }

  if (!hasGSAP) {
    // CDN unavailable. Pages with script.js keep their observer reveals;
    // pages without it (404, thank-you) must not hide content forever.
    if (!document.querySelector('script[src$="script.js"]')) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showAllReveals);
      } else {
        showAllReveals();
      }
    }
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('gsap-motion');

  const run = () => {
    // ── 1. Hero entrance choreography ──
    // Tag hero content columns with data-hero-stagger; their direct
    // children rise in one after another on page load.
    document.querySelectorAll('[data-hero-stagger]').forEach((col, i) => {
      gsap.from(col.children, {
        opacity: 0,
        y: 28,
        duration: 0.85,
        ease: 'power3.out',
        stagger: 0.09,
        delay: 0.12 + i * 0.18,
        clearProps: 'opacity,transform'
      });
    });

    // ── 2. Batched scroll reveals with stagger ──
    const targets = gsap.utils.toArray(REVEAL_SEL);
    if (targets.length) {
      ScrollTrigger.batch(targets, {
        start: 'top 90%',
        once: true,
        batchMax: 8,
        onEnter: batch => gsap.to(batch, {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.08,
          overwrite: true,
          // Hand styling back to CSS when done so card hover
          // transforms keep working (inline styles would override them).
          clearProps: 'opacity,transform,filter',
          onStart: () => batch.forEach(el => el.classList.add('visible'))
        })
      });
      // Recalculate trigger positions once images/fonts have loaded.
      window.addEventListener('load', () => ScrollTrigger.refresh());
    }

    // ── 3. Subtle hero parallax (decorative layers only) ──
    const hero = document.querySelector('#hero');
    if (hero) {
      const frame = hero.querySelector('.hero-img-frame');
      if (frame) {
        gsap.to(frame, {
          y: -36,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 }
        });
      }
      const grid = hero.querySelector('.hero-grid-overlay');
      if (grid) {
        gsap.to(grid, {
          yPercent: 12,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 }
        });
      }
    }

    // ── 4. Magnetic pull on the nav CTA (fine pointers only) ──
    if (window.matchMedia('(pointer: fine)').matches) {
      document.querySelectorAll('.nav-cta-btn').forEach(el => {
        el.style.willChange = 'transform';
        const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'elastic.out(1,0.4)' });
        const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'elastic.out(1,0.4)' });
        el.addEventListener('mousemove', e => {
          const r = el.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * 0.25);
          yTo((e.clientY - r.top - r.height / 2) * 0.25);
        });
        el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
