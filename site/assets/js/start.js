/* Phones, tablets and reduced-motion visits skip the desktop motion stack. */
(() => {
  'use strict';
  const load = src => new Promise(resolve => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => resolve(false), 3500);
    script.src = src;
    // Fetch in parallel, execute dependencies in insertion order.
    script.async = false;
    script.onload = () => { clearTimeout(timeout); resolve(true); };
    script.onerror = () => { clearTimeout(timeout); resolve(false); };
    document.head.append(script);
  });
  const start = () => load('/assets/js/main.js');
  if (window.__NT_LITE) { start(); return; }
  Promise.all(['gsap', 'ScrollTrigger', 'SplitText', 'lenis'].map(name => load(`/assets/vendor/${name}.min.js`))).then(results => {
    if (results.some(ok => !ok)) {
      window.__NT_LITE = true;
      document.documentElement.dataset.motion = 'light';
      document.documentElement.classList.add('no-anim');
      document.documentElement.classList.remove('is-booting');
    }
    start();
  });
})();
