/* =====================================================================
   NICK TECHNOLOGY GROUP: interactions & motion
   GSAP + ScrollTrigger + SplitText + Lenis, with graceful fallbacks.
   ===================================================================== */
(() => {
  'use strict';

  const d = document;
  const html = d.documentElement;
  const w = window;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lightweight = !!w.__NT_LITE;
  const hasGSAP = !!(w.gsap && w.ScrollTrigger);
  const animated = hasGSAP && !reduced && !lightweight;

  w.__NT_READY = true;
  if (!animated) html.classList.add('no-anim');
  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    if (w.SplitText) gsap.registerPlugin(SplitText);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  const WA_NUMBER = '18764655975';
  const EMAIL = 'COMTEC_ZION@YAHOO.COM';

  /* ------------------------------------------------------------------
     Jamaica time, live open/closed status, clocks
     ------------------------------------------------------------------ */
  const OPEN = 8 * 60 + 30;
  const CLOSE = 18 * 60 + 30;
  const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const jmFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Jamaica', hour12: false, weekday: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  function jmNow() {
    const parts = {};
    jmFormat.formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
    return { day: DAY_INDEX[parts.weekday], h: +parts.hour % 24, m: +parts.minute, s: +parts.second };
  }

  const pad = (n) => String(n).padStart(2, '0');
  const fmt12 = (mins) => {
    const h = Math.floor(mins / 60);
    return `${h % 12 || 12}:${pad(mins % 60)} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  function shopStatus() {
    const t = jmNow();
    const mins = t.h * 60 + t.m;
    const workday = t.day >= 1 && t.day <= 6;
    if (workday && mins >= OPEN && mins < CLOSE) {
      const left = CLOSE - mins;
      if (left <= 45) return { state: 'soon', text: 'Closing soon', sub: `Closes in ${left} min · ${fmt12(CLOSE)}` };
      return { state: 'open', text: 'Open now', sub: `Open until ${fmt12(CLOSE)} today` };
    }
    let when = 'tomorrow';
    if (workday && mins < OPEN) when = 'today';
    else if (t.day === 6) when = 'Monday';
    return { state: 'closed', text: 'Closed now', sub: `Opens ${when} at ${fmt12(OPEN)}` };
  }

  function paintStatus() {
    if (d.hidden) return;
    const s = shopStatus();
    const today = jmNow().day;
    $$('[data-status]').forEach((el) => {
      el.dataset.state = s.state;
      const txt = $('[data-status-text]', el);
      if (txt) txt.textContent = s.text;
    });
    $$('[data-status-sub]').forEach((el) => { el.textContent = s.sub; });
    $$('[data-hours] li').forEach((li) => li.classList.toggle('is-today', +li.dataset.day === today));
  }

  function tickClocks() {
    if (d.hidden) return;
    const t = jmNow();
    const clock = fmt12(t.h * 60 + t.m);
    $$('[data-clock]').forEach((el) => { el.textContent = clock; });
    const stamp = `${pad(t.h)}:${pad(t.m)}${lightweight ? '' : `:${pad(t.s)}`}`;
    $$('[data-feed-time]').forEach((el) => { el.textContent = stamp; });
  }

  paintStatus();
  tickClocks();
  setInterval(tickClocks, lightweight ? 60000 : 1000);
  setInterval(paintStatus, 60000);
  d.addEventListener('visibilitychange', () => { if (!d.hidden) { tickClocks(); paintStatus(); } });
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ------------------------------------------------------------------
     Smooth scroll (Lenis)
     ------------------------------------------------------------------ */
  let lenis = null;
  if (animated && w.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    if (html.classList.contains('is-booting')) lenis.stop();
  }

  const scrollToTarget = (target, offset = -90) => {
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 });
    else if (typeof target === 'number') w.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  const pagePath = path => path.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');
  const samePage = (url) => url.origin === location.origin && pagePath(url.pathname) === pagePath(location.pathname);
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a || a.hasAttribute('data-to-top')) return;
    const url = new URL(a.href, location.href);
    if (!samePage(url) || url.hash.length < 2) return;
    const target = d.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    scrollToTarget(target);
    history.pushState(null, '', url.hash);
  });
  $$('[data-to-top]').forEach((btn) => btn.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToTarget(0, 0);
  }));

  /* ------------------------------------------------------------------
     Nav: hide on scroll, pill indicator, progress, floating buttons
     ------------------------------------------------------------------ */
  const nav = $('[data-nav]');
  const progress = $('.scroll-progress');
  const toTop = $('.to-top');
  const dock = $('[data-dock]');
  let lastY = 0;

  function onScroll(y) {
    if (nav) {
      nav.classList.toggle('is-scrolled', y > 24);
      if (!lightweight && !html.classList.contains('menu-open') && Math.abs(y - lastY) > 4) {
        nav.classList.toggle('is-hidden', y > lastY && y > 420);
      }
    }
    lastY = y;
    const max = d.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, y / max) : 0;
    if (progress) progress.style.setProperty('--p', p.toFixed(4));
    if (toTop) {
      toTop.classList.toggle('is-visible', y > 900);
      toTop.style.setProperty('--off', (1 - p).toFixed(4));
    }
    if (dock) dock.classList.toggle('is-visible', y > innerHeight * 0.55);
  }
  if (lenis) lenis.on('scroll', (e) => onScroll(e.scroll));
  else {
    let scheduled = false;
    addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { onScroll(scrollY); scheduled = false; });
    }, { passive: true });
  }
  onScroll(scrollY);

  const links = $('.nav__links');
  const pill = $('.nav__pill');
  if (links && pill) {
    const active = $('a.is-active', links);
    const movePill = (a) => {
      if (!a) { pill.style.setProperty('--o', 0); return; }
      pill.style.setProperty('--x', `${a.offsetLeft}px`);
      pill.style.setProperty('--w', `${a.offsetWidth}px`);
      pill.style.setProperty('--o', 1);
    };
    $$('a', links).forEach((a) => a.addEventListener('mouseenter', () => movePill(a)));
    links.addEventListener('mouseleave', () => movePill(active));
    movePill(active);
    d.fonts && d.fonts.ready.then(() => movePill(active));
    addEventListener('resize', () => movePill(active));
  }

  /* ------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------ */
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  if (burger && menu) {
    menu.inert = true;
    const background = [$('#main'), $('.footer'), dock].filter(Boolean);
    const setMenu = (open, restoreFocus = true) => {
      html.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.setAttribute('aria-hidden', String(!open));
      menu.inert = !open;
      background.forEach(el => { el.inert = open; });
      if (open) {
        nav.classList.remove('is-hidden'); lenis && lenis.stop();
        $('a', menu)?.focus();
      } else {
        lenis && lenis.start();
        if (restoreFocus) burger.focus();
      }
    };
    burger.addEventListener('click', () => setMenu(!html.classList.contains('menu-open')));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false, false)));
    d.addEventListener('keydown', (e) => {
      if (!html.classList.contains('menu-open')) return;
      if (e.key === 'Escape') { setMenu(false); return; }
      if (e.key === 'Tab') {
        const focusables = [burger, ...$$('a[href], button', menu)];
        const current = focusables.indexOf(d.activeElement);
        const next = (current + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
        e.preventDefault(); focusables[next].focus();
      }
    });
    matchMedia('(min-width: 1181px)').addEventListener('change', (e) => { if (e.matches && html.classList.contains('menu-open')) setMenu(false, false); });
  }

  /* ------------------------------------------------------------------
     Custom cursor (fine pointers only)
     ------------------------------------------------------------------ */
  if (finePointer && !reduced && !lightweight) {
    const cur = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    const label = $('.cursor__label');
    if (cur && dot && ring) {
      html.classList.add('has-cursor');
      let mx = -100, my = -100, rx = -100, ry = -100;
      addEventListener('pointermove', (e) => {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
        cur.classList.remove('is-hidden');
      }, { passive: true });
      html.addEventListener('mouseleave', () => cur.classList.add('is-hidden'));
      const loop = () => {
        rx += (mx - rx) * 0.2;
        ry += (my - ry) * 0.2;
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
        requestAnimationFrame(loop);
      };
      loop();
      d.addEventListener('pointerover', (e) => {
        const view = e.target.closest('[data-cursor]');
        const hover = e.target.closest('a, button, label, summary, [role="button"], input[type="range"]');
        cur.classList.toggle('is-view', !!view);
        cur.classList.toggle('is-hover', !view && !!hover);
        if (label) label.textContent = view ? (view.dataset.cursor === 'drag' ? 'DRAG' : 'VIEW') : '';
      });
    }
  }

  /* ------------------------------------------------------------------
     Magnetic buttons + spotlight cards
     ------------------------------------------------------------------ */
  if (finePointer && animated) {
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' });
      const strength = el.classList.contains('orb') ? 0.4 : 0.28;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * strength);
        yTo((e.clientY - r.top - r.height / 2) * strength);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }
  if (finePointer && !lightweight) {
    d.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('[data-spot]');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     Marquees (reviews): clone until the loop is seamless
     ------------------------------------------------------------------ */
  $$('[data-marquee]').forEach((m) => {
    if (lightweight) return;
    const track = $('.marquee__track', m);
    const originals = [...track.children];
    const gap = 16;
    const setWidth = originals.reduce((sum, el) => sum + el.getBoundingClientRect().width + gap, 0) || 1;
    const copies = Math.max(1, Math.ceil((innerWidth + 200) / setWidth));
    const addSet = () => originals.forEach((el) => {
      const c = el.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.inert = true;
      track.appendChild(c);
    });
    for (let i = 1; i < copies; i++) addSet();
    for (let i = 0; i < copies; i++) addSet();
    track.style.setProperty('--dur', `${Math.round(setWidth * copies / 38)}s`);
  });

  /* ------------------------------------------------------------------
     Videos: play only when visible; reel sound toggles
     ------------------------------------------------------------------ */
  const videos = $$('video');
  const playVideo = async v => {
    if (!v.getAttribute('src') && v.dataset.src) { v.src = v.dataset.src; v.load(); }
    if (lightweight) videos.forEach(other => { if (other !== v) other.pause(); });
    try { await v.play(); } catch (_) { /* Poster and play control remain available. */ }
  };
  const videoIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const v = en.target;
      if (en.isIntersecting && !lightweight && !reduced && !d.hidden) playVideo(v);
      else if (!en.isIntersecting) v.pause();
    });
  }, { threshold: 0.2 });
  videos.forEach((v) => {
    v.muted = true;
    videoIO.observe(v);
  });
  d.addEventListener('visibilitychange', () => { if (d.hidden) videos.forEach(v => v.pause()); });
  const setSoundIcon = (btn, on) => {
    $('use', btn).setAttribute('href', on ? '#i-sound' : '#i-mute');
    btn.setAttribute('aria-label', on ? 'Mute' : 'Turn sound on');
  };
  $$('[data-reel]').forEach((reel) => {
    const v = $('video', reel);
    const btn = $('[data-reel-sound]', reel);
    const play = d.createElement('button');
    play.type = 'button'; play.className = 'reel__play';
    const title = v.getAttribute('aria-label') || 'Work video';
    const updatePlay = () => {
      play.textContent = v.paused ? '▶ Play' : 'Ⅱ Pause';
      play.setAttribute('aria-label', `${v.paused ? 'Play' : 'Pause'}: ${title}`);
      reel.classList.toggle('is-playing', !v.paused);
    };
    updatePlay(); reel.append(play);
    v.addEventListener('play', updatePlay); v.addEventListener('pause', updatePlay);
    play.addEventListener('click', e => { e.stopPropagation(); v.paused ? playVideo(v) : v.pause(); });
    btn && btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const turnOn = v.muted;
      $$('[data-reel]').forEach((r) => {
        const rv = $('video', r);
        rv.muted = true;
        const b = $('[data-reel-sound]', r);
        b && setSoundIcon(b, false);
      });
      v.muted = !turnOn;
      setSoundIcon(btn, turnOn);
      if (turnOn) playVideo(v);
    });
    reel.addEventListener('click', () => { v.paused ? playVideo(v) : v.pause(); });
  });

  /* ------------------------------------------------------------------
     Accordion with animated height (one open at a time)
     ------------------------------------------------------------------ */
  $$('[data-accordion]').forEach((acc) => {
    const items = $$('details', acc);
    const close = (det) => {
      const body = $('.acc__body', det);
      if (!animated) { det.open = false; return; }
      gsap.fromTo(body, { height: body.offsetHeight }, {
        height: 0, duration: 0.5, ease: 'power3.inOut',
        onComplete: () => { det.open = false; body.style.height = ''; ScrollTrigger.refresh(); },
      });
    };
    items.forEach((det) => {
      $('summary', det).addEventListener('click', (e) => {
        e.preventDefault();
        if (det.open) { close(det); return; }
        items.forEach((o) => { if (o !== det && o.open) close(o); });
        det.open = true;
        if (!animated) return;
        const body = $('.acc__body', det);
        gsap.fromTo(body, { height: 0 }, {
          height: body.scrollHeight, duration: 0.6, ease: 'power3.out',
          onComplete: () => { body.style.height = ''; ScrollTrigger.refresh(); },
        });
      });
    });
  });

  /* ------------------------------------------------------------------
     Forms → WhatsApp (or email). Nothing is stored or sent by the site.
     ------------------------------------------------------------------ */
  $$('[data-wa-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      const phone = String(fd.get('phone') || '').trim();
      const service = String(fd.get('service') || 'Not sure yet');
      const message = String(fd.get('message') || '').trim();
      const err = $('[data-form-error]', form);
      $$('.field', form).forEach((f) => f.classList.remove('is-invalid'));

      const bad = [];
      if (!name) bad.push('name');
      if (phone.replace(/\D/g, '').length < 7) bad.push('phone');
      if (bad.length) {
        bad.forEach((n) => form.elements[n].closest('.field').classList.add('is-invalid'));
        if (err) err.textContent = 'Please add your name and a phone number we can reach you on.';
        form.elements[bad[0]].focus();
        return;
      }
      if (err) err.textContent = '';

      const lines = [
        "Hi Nicholas, I'd like a quote.",
        '',
        `Service: ${service}`,
        `Name: ${name}`,
        `Phone: ${phone}`,
      ];
      if (message) lines.push(`Details: ${message}`);
      const text = lines.join('\n');

      if (e.submitter && e.submitter.dataset.via === 'email') {
        location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`Quote request: ${service}`)}&body=${encodeURIComponent(text)}`;
      } else {
        w.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      }
    });
  });

  /* Click-to-load Google Map (privacy: nothing loads until asked) */
  $$('[data-map-load]').forEach((btn) => btn.addEventListener('click', () => {
    const map = btn.closest('[data-map]');
    const frame = d.createElement('iframe');
    frame.src = 'https://maps.google.com/maps?q=Nick%20technology%20group%20Portmore%20Jamaica&z=15&output=embed';
    frame.title = 'Map showing Nick Technology in Portmore';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'no-referrer-when-downgrade';
    frame.allowFullscreen = true;
    map.appendChild(frame);
    $('.map__placeholder', map).remove();
  }));

  /* Copy-to-clipboard buttons */
  $$('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      const label = $('[data-copy-label]', btn);
      if (!label) return;
      const prev = label.textContent;
      label.textContent = 'Copied';
      btn.classList.add('is-copied');
      setTimeout(() => { label.textContent = prev; btn.classList.remove('is-copied'); }, 1600);
    } catch (_) { /* clipboard blocked: the visible text is still selectable */ }
  }));

  /* ------------------------------------------------------------------
     Before / after slider (native range input for a11y + touch)
     ------------------------------------------------------------------ */
  $$('[data-ba]').forEach((ba) => {
    const range = $('input[type="range"]', ba);
    const set = (v) => ba.style.setProperty('--pos', `${v}%`);
    range.addEventListener('input', () => set(range.value));
    set(range.value);
    if (animated) {
      ScrollTrigger.create({
        trigger: ba, start: 'top 70%', once: true,
        onEnter: () => {
          const o = { v: 50 };
          const upd = () => { range.value = o.v; set(o.v); };
          gsap.timeline({ delay: 0.3 })
            .to(o, { v: 28, duration: 0.8, ease: 'power2.inOut', onUpdate: upd })
            .to(o, { v: 72, duration: 1.1, ease: 'power2.inOut', onUpdate: upd })
            .to(o, { v: 50, duration: 0.8, ease: 'power2.inOut', onUpdate: upd });
        },
      });
    }
  });

  /* ------------------------------------------------------------------
     Filterable grids (gallery, services)
     ------------------------------------------------------------------ */
  $$('[data-filter-bar]').forEach((bar) => {
    const scope = d.getElementById(bar.dataset.filterBar) || d;
    const items = $$('[data-cat]', scope);
    const count = $('[data-filter-count]');
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-filter]');
      if (!b) return;
      $$('button[data-filter]', bar).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const f = b.dataset.filter;
      const show = items.filter((i) => f === 'all' || i.dataset.cat.split(' ').includes(f));
      const apply = () => {
        items.forEach((i) => { i.hidden = !show.includes(i); });
        if (count) count.textContent = show.length;
        if (hasGSAP) ScrollTrigger.refresh();
      };
      if (!animated) { apply(); return; }
      gsap.to(items, {
        autoAlpha: 0, y: 12, duration: 0.22, ease: 'power2.in',
        onComplete: () => {
          apply();
          gsap.fromTo(show, { autoAlpha: 0, y: 24, scale: 0.97 }, {
            autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out', stagger: 0.035,
            clearProps: 'transform,opacity,visibility',
          });
        },
      });
    });
  });

  /* Floating image preview on list rows (services index) */
  const preview = $('[data-hover-preview]');
  if (preview && finePointer) {
    const img = $('img', preview);
    const xTo = animated ? gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3.out' }) : null;
    const yTo = animated ? gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3.out' }) : null;
    $$('[data-preview-img]').forEach((row) => {
      row.addEventListener('pointerenter', () => {
        img.src = row.dataset.previewImg;
        preview.classList.add('is-on');
      });
      row.addEventListener('pointerleave', () => preview.classList.remove('is-on'));
      row.addEventListener('pointermove', (e) => {
        if (xTo) { xTo(e.clientX + 24); yTo(e.clientY - 90); }
        else preview.style.transform = `translate(${e.clientX + 24}px, ${e.clientY - 90}px)`;
      });
    });
  }

  /* ------------------------------------------------------------------
     Lightbox (gallery)
     ------------------------------------------------------------------ */
  const lb = $('[data-lightbox]');
  if (lb) {
    const lbImg = $('[data-lb-img]', lb);
    const lbCap = $('[data-lb-cap]', lb);
    const lbCount = $('[data-lb-count]', lb);
    const figs = $$('[data-lb]');
    let list = [];
    let idx = 0;
    lbImg.addEventListener('load', () => lbImg.classList.toggle('is-small', lbImg.naturalWidth < 600));
    const show = (i) => {
      idx = (i + list.length) % list.length;
      const f = list[idx];
      const im = $('img', f);
      lbImg.src = f.dataset.lb || im.currentSrc || im.src;
      lbImg.alt = im.alt;
      lbCap.textContent = im.alt;
      lbCount.textContent = `${pad(idx + 1)} / ${pad(list.length)}`;
      if (animated) gsap.fromTo(lbImg, { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
    };
    figs.forEach((f) => f.addEventListener('click', () => {
      list = figs.filter((x) => !x.hidden && !x.closest('[hidden]'));
      lb.showModal();
      lenis && lenis.stop();
      show(list.indexOf(f));
    }));
    $('[data-lb-prev]', lb).addEventListener('click', () => show(idx - 1));
    $('[data-lb-next]', lb).addEventListener('click', () => show(idx + 1));
    $('[data-lb-close]', lb).addEventListener('click', () => lb.close());
    lb.addEventListener('close', () => lenis && lenis.start());
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    let sx = 0;
    lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    });
  }

  /* ------------------------------------------------------------------
     Article reader (blog)
     ------------------------------------------------------------------ */
  const reader = $('[data-reader]');
  if (reader) {
    const body = $('[data-reader-body]', reader);
    $$('[data-post]').forEach((btn) => btn.addEventListener('click', () => {
      const tpl = d.getElementById(`post-${btn.dataset.post}`);
      if (!tpl) return;
      body.replaceChildren(tpl.content.cloneNode(true));
      reader.showModal();
      reader.scrollTop = 0;
      $('.reader__scroll', reader) && ($('.reader__scroll', reader).scrollTop = 0);
      lenis && lenis.stop();
      if (animated) gsap.fromTo(body.children, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.04 });
    }));
    $$('[data-reader-close]', reader).forEach((b) => b.addEventListener('click', () => reader.close()));
    reader.addEventListener('close', () => lenis && lenis.start());
    reader.addEventListener('click', (e) => { if (e.target === reader) reader.close(); });
  }

  /* ------------------------------------------------------------------
     Story chapters (about): sticky image follows the active chapter
     ------------------------------------------------------------------ */
  const chapters = $('[data-chapters]');
  if (chapters) {
    const imgs = $$('[data-chapter-img]', chapters);
    const items = $$('[data-chapter]', chapters);
    const tag = $('[data-chapter-tag]', chapters);
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const i = items.indexOf(en.target);
      imgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
      if (tag) tag.textContent = en.target.dataset.chapter;
    }), { rootMargin: '-45% 0px -45% 0px' });
    items.forEach((it) => io.observe(it));
    imgs[0] && imgs[0].classList.add('is-on');
  }

  /* ------------------------------------------------------------------
     Phone repair hero: cracked screen → repaired, on a loop
     ------------------------------------------------------------------ */
  const mock = $('[data-phone-mock]');
  if (mock) {
    const cracks = $$('.phone-mock__crack path', mock);
    const ring = $('.phone-mock__ring circle:last-child', mock);
    const pctEl = $('.phone-mock__pct', mock);
    const state = $('.phone-mock__state', mock);
    const fixed = () => { pctEl.textContent = '100%'; state.textContent = 'Fixed · tested'; ring.style.strokeDashoffset = 0; };
    if (!animated) {
      cracks.forEach((p) => { p.style.strokeDashoffset = 1; });
      fixed();
    } else {
      const o = { v: 0 };
      gsap.timeline({ repeat: -1, repeatDelay: 0.4, delay: 1 })
        .call(() => { mock.classList.add('is-cracked'); state.textContent = 'Screen damaged'; pctEl.textContent = '!!'; ring.style.strokeDashoffset = 1; })
        .fromTo(cracks, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.45, stagger: 0.05, ease: 'power4.out' })
        .to({}, { duration: 1.3 })
        .call(() => { state.textContent = 'Repairing…'; })
        .to(cracks, { strokeDashoffset: -1, duration: 1, stagger: 0.06, ease: 'power2.inOut' })
        .call(() => { mock.classList.remove('is-cracked'); o.v = 0; })
        .to(o, { v: 100, duration: 1.6, ease: 'power2.out', onUpdate: () => { pctEl.textContent = `${Math.round(o.v)}%`; ring.style.strokeDashoffset = 1 - o.v / 100; } })
        .call(fixed)
        .to({}, { duration: 2.6 });
    }
  }

  /* ------------------------------------------------------------------
     Install sequence: clickable steps (works with or without motion)
     ------------------------------------------------------------------ */
  const seq = $('[data-seq]');
  let seqTrigger = null;
  const seqApi = (() => {
    if (!seq) return null;
    const imgs = $$('[data-seq-img]', seq);
    const steps = $$('[data-seq-step]', seq);
    const count = $('[data-seq-count]', seq);
    const label = $('[data-seq-label]', seq);
    const meter = $('.seq__meter', seq);
    const labels = steps.map((s) => $('.seq__title', s).textContent);
    let cur = -1;
    const setStep = (i) => {
      if (i === cur) return;
      cur = i;
      steps.forEach((s, k) => {
        s.classList.toggle('is-active', k === i);
        $('button', s)?.setAttribute('aria-pressed', String(k === i));
      });
      imgs.forEach((im, k) => im.setAttribute('aria-hidden', String(k !== i)));
      if (count) count.textContent = pad(i + 1);
      if (label) label.textContent = labels[i];
      if (!animated) {
        imgs.forEach((im, k) => { im.style.opacity = k <= i ? 1 : 0; });
        meter && meter.style.setProperty('--p', (i + 1) / 3);
      }
    };
    steps.forEach((s, i) => s.addEventListener('click', () => {
      if (seqTrigger) {
        const at = seqTrigger.start + (seqTrigger.end - seqTrigger.start) * [0.05, 0.58, 0.97][i];
        scrollToTarget(at, 0);
      } else setStep(i);
    }));
    setStep(animated ? 0 : 2);
    return { imgs, meter, setStep };
  })();

  /* ------------------------------------------------------------------
     Motion: everything below needs GSAP and no reduced-motion
     ------------------------------------------------------------------ */
  function heroIntro() {
    const hero = $('[data-hero]') || $('.page-hero');
    if (!hero || !animated) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo($$('.hero__line > span', hero), { y: 0, yPercent: 108 }, { yPercent: 0, duration: 1.35, stagger: 0.1 }, 0.05)
      .fromTo($$('[data-hero-in]', hero), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.35);

    const feeds = $$('.feed', hero);
    if (feeds.length) {
      tl.fromTo(feeds,
        { scaleY: 0.008, scaleX: 0.6, filter: 'brightness(4)' },
        { scaleY: 1, scaleX: 1, filter: 'brightness(1)', duration: 0.75, ease: 'power4.out', stagger: { each: 0.09, from: 'random' } }, 0.3)
        .fromTo($$('.hero__badge, .hero__status', hero), { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 1, ease: 'back.out(1.6)', stagger: 0.12 }, 0.95);
    }

    // Hero stats count up with the intro
    $$('[data-count]', hero).forEach((el) => countUp(el, 1.1));

    // Mouse-reactive tilt on the video wall
    const wall = $('[data-wall-tilt]', hero);
    if (wall && finePointer && innerWidth > 1180) {
      gsap.set(wall, { rotationY: -13, rotationX: 5, rotationZ: 0.5 });
      const ry = gsap.quickTo(wall, 'rotationY', { duration: 1.4, ease: 'power3.out' });
      const rx = gsap.quickTo(wall, 'rotationX', { duration: 1.4, ease: 'power3.out' });
      hero.addEventListener('pointermove', (e) => {
        ry(-13 + (e.clientX / innerWidth - 0.5) * 12);
        rx(5 - (e.clientY / innerHeight - 0.5) * 9);
      });
    }

    // Gentle scroll parallax out of the hero
    const copy = $('.hero__copy', hero);
    const wallWrap = $('.hero__wall', hero);
    if (copy && wallWrap) {
      gsap.to(copy, { yPercent: -10, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to(wallWrap, { yPercent: -16, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    }

    if (feeds.length) startFeedSwitching(feeds);
  }

  function startFeedSwitching(feeds) {
    const pool = [
      ['wall-coast-sm', 'Command room'], ['wall-live-sm', 'Street view'], ['install-pole', 'Perimeter'],
      ['install-camera-sm', 'On site'], ['install-ladder-sm', 'Install crew'], ['nicholas-shop', 'Front desk'],
      ['on-site-sm', 'Site survey'], ['forza-titan-700-sm', 'Power bay'], ['solar-panel-sm', 'Solar bench'],
      ['wall-mounted-sm', 'Wall 02'],
    ].map(([f, n]) => ({ src: `assets/img/${f}.webp`, name: n }));
    pool.forEach((p) => { const i = new Image(); i.src = p.src; });
    const imgFeeds = feeds.filter((f) => $('img', f));
    setInterval(() => {
      if (d.hidden) return;
      const f = imgFeeds[Math.floor(Math.random() * imgFeeds.length)];
      const img = $('img', f);
      const inUse = imgFeeds.map((x) => $('img', x).getAttribute('src'));
      const options = pool.filter((p) => !inUse.includes(p.src));
      const next = options[Math.floor(Math.random() * options.length)];
      if (!next) return;
      f.classList.add('is-glitch');
      setTimeout(() => {
        img.src = next.src;
        img.alt = `Camera feed: ${next.name}`;
        const name = $('.feed__name', f);
        if (name) name.textContent = next.name;
      }, 160);
      setTimeout(() => f.classList.remove('is-glitch'), 420);
    }, 2800);
  }

  function countUp(el, delay = 0) {
    const end = parseFloat(el.dataset.count);
    const dec = +(el.dataset.decimals || 0);
    const comma = el.dataset.format === 'comma';
    const fmt = (v) => (comma ? Math.round(v).toLocaleString('en-US') : v.toFixed(dec));
    const o = { v: 0 };
    el.textContent = fmt(0);
    gsap.to(o, { v: end, duration: 2.2, delay, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } });
  }

  function initScrollMotion() {
    if (!animated) return;

    // Split-line headings
    $$('[data-split]').forEach((el) => {
      if (!w.SplitText) { el.style.visibility = 'visible'; return; }
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
        onSplit(self) {
          el.style.visibility = 'visible';
          return gsap.from(self.lines, {
            yPercent: 115, duration: 1.25, ease: 'expo.out', stagger: 0.09,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          });
        },
      });
    });

    // Fade / clip reveals
    $$('[data-reveal]').forEach((el) => {
      const clip = el.dataset.reveal === 'clip';
      const done = () => { el.classList.add('is-in'); gsap.set(el, { clearProps: 'opacity,visibility,transform,clipPath' }); };
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => {
          if (clip) {
            gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0% round 26px)' }, { clipPath: 'inset(0% 0% 0% 0% round 26px)', duration: 1.4, ease: 'expo.inOut', onComplete: done });
            const img = $('img', el);
            img && gsap.fromTo(img, { scale: 1.35 }, { scale: 1, duration: 1.9, ease: 'expo.out', clearProps: 'transform' });
          } else {
            gsap.fromTo(el, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', onComplete: done });
          }
        },
      });
    });

    // Staggered children (batched as they enter)
    $$('[data-stagger]').forEach((c) => {
      ScrollTrigger.batch([...c.children], {
        start: 'top 90%', once: true,
        onEnter: (batch) => {
          batch.forEach((k) => k.classList.add('st-anim'));
          gsap.fromTo(batch, { autoAlpha: 0, y: 44 }, {
            autoAlpha: 1, y: 0, duration: 1.05, ease: 'expo.out', stagger: 0.08,
            onComplete: () => {
              batch.forEach((k) => { k.classList.add('is-in'); k.classList.remove('st-anim'); });
              gsap.set(batch, { clearProps: 'opacity,visibility,transform' });
            },
          });
        },
      });
    });

    // Counters outside the hero
    $$('[data-count]').forEach((el) => {
      if (el.closest('[data-hero]')) return;
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => countUp(el) });
    });

    // Towns ticker: scroll velocity speeds it up and reverses it
    const ticker = $('[data-ticker]');
    if (ticker) {
      const track = $('.ticker__track', ticker);
      const clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      ticker.appendChild(clone);
      const tracks = [track, clone];
      const loop = gsap.to(tracks, { xPercent: -100, duration: 38, ease: 'none', repeat: -1 });
      const skew = gsap.quickTo(tracks, 'skewX', { duration: 0.5, ease: 'power3.out' });
      let settle;
      ScrollTrigger.create({
        trigger: ticker, start: 'top bottom', end: 'bottom top',
        onUpdate(self) {
          const v = self.getVelocity();
          const dir = self.direction;
          loop.timeScale(dir * (1 + Math.min(Math.abs(v) / 260, 7)));
          skew(gsap.utils.clamp(-10, 10, -v / 250));
          clearTimeout(settle);
          settle = setTimeout(() => { gsap.to(loop, { timeScale: dir, duration: 1.2 }); skew(0); }, 120);
        },
      });
    }

    // Install sequence: pinned, scrubbed wipe from brackets to live wall
    if (seq && seqApi) {
      const screen = $('.seq__screen', seq);
      const edge = d.createElement('i');
      edge.className = 'seq__edge';
      edge.setAttribute('aria-hidden', 'true');
      screen.appendChild(edge);
      const [, img2, img3] = seqApi.imgs;
      const flash = $('.seq__flash', seq);
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: seq, start: 'top top', end: () => `+=${innerHeight * 2.2}`,
          pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            seqApi.meter && seqApi.meter.style.setProperty('--p', Math.max(0.06, p).toFixed(3));
            seqApi.setStep(p < 0.36 ? 0 : p < 0.8 ? 1 : 2);
          },
        },
      });
      tl.to(seqApi.imgs[0], { scale: 1.06, duration: 1, ease: 'none' }, 0)
        .fromTo(edge, { left: '0%', autoAlpha: 1 }, { left: '100%', duration: 1, ease: 'none' }, 0.25)
        .fromTo(img2, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'none' }, 0.25)
        .set(edge, { autoAlpha: 0 }, 1.25)
        .fromTo(edge, { left: '0%', autoAlpha: 1 }, { left: '100%', duration: 1, ease: 'none', immediateRender: false }, 1.6)
        .fromTo(img3, { clipPath: 'inset(0% 100% 0% 0%)', filter: 'brightness(2.2)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'none' }, 1.6)
        .set(edge, { autoAlpha: 0 }, 2.6)
        .to(flash, { opacity: 0.85, duration: 0.12 }, 2.6)
        .to(flash, { opacity: 0, duration: 0.35 }, 2.72)
        .to(img3, { filter: 'brightness(1)', duration: 0.4 }, 2.62)
        .to({}, { duration: 0.35 });
      seqTrigger = tl.scrollTrigger;
    }

    // Comparison rows: strike-through the competition, tick our column
    const compareRows = $$('.compare__row');
    if (compareRows.length) {
      ScrollTrigger.batch(compareRows, {
        start: 'top 85%', once: true,
        onEnter: (batch) => batch.forEach((r, i) => setTimeout(() => r.classList.add('is-in'), i * 140)),
      });
    }

    // Process: copper line fills as you scroll through
    $$('[data-process]').forEach((list) => {
      gsap.fromTo(list, { '--p': 0 }, { '--p': 1, ease: 'none', scrollTrigger: { trigger: list, start: 'top 80%', end: 'bottom 55%', scrub: true } });
      gsap.from($$('.step', list), { autoAlpha: 0, y: 40, duration: 1, ease: 'expo.out', stagger: 0.12, clearProps: 'all', scrollTrigger: { trigger: list, start: 'top 82%', once: true } });
    });

    // Photo strip drifts sideways with scroll
    const strip = $('[data-strip]');
    if (strip) {
      const row = $('.strip__row', strip);
      gsap.fromTo(row, { x: () => innerWidth * 0.05 }, {
        x: () => -(row.scrollWidth - innerWidth * 0.95), ease: 'none',
        scrollTrigger: { trigger: strip, start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true },
      });
    }

    // Stacked spotlight cards shrink as the next one slides over
    const mm = gsap.matchMedia();
    mm.add('(min-width: 761px)', () => {
      const cards = $$('[data-stack]');
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        gsap.to(card, {
          scale: 0.93, filter: 'brightness(0.55)', ease: 'none',
          scrollTrigger: { trigger: next, start: 'top 65%', end: 'top 22%', scrub: true },
        });
      });
    });

    // Generic image parallax
    $$('[data-parallax]').forEach((el) => {
      const amt = parseFloat(el.dataset.parallax) || 10;
      gsap.fromTo(el, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Circuit traces draw in
    $$('.cta-band__traces path').forEach((p, i) => {
      gsap.to(p, { strokeDashoffset: 0, duration: 2.2, delay: i * 0.12, ease: 'power2.inOut', scrollTrigger: { trigger: '.cta-band', start: 'top 75%', once: true } });
    });

    // Footer wordmark letters rise
    const word = $('[data-footer-word]');
    if (word) {
      gsap.from($$('span', word), { yPercent: 70, autoAlpha: 0, duration: 1.3, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: word, start: 'top 98%', once: true } });
    }

    // Once fonts settle, recalculate every trigger
    d.fonts && d.fonts.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh());
  }

  function staticFallbacks() {
    $$('.compare__row').forEach((r) => r.classList.add('is-in'));
    $$('[data-process]').forEach((l) => l.style.setProperty('--p', 1));
  }

  /* ------------------------------------------------------------------
     Boot sequence (first visit per session), then start everything
     ------------------------------------------------------------------ */
  function boot(done) {
    const el = $('[data-boot]');
    if (!el || !html.classList.contains('is-booting')) { done(); return; }
    try { sessionStorage.setItem('nt-booted', '1'); } catch (_) { /* private mode */ }
    const pct = $('[data-boot-pct]', el);
    const start = performance.now();
    const dur = 1500;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      el.classList.add('is-done');
      setTimeout(done, 260);
      setTimeout(() => { html.classList.remove('is-booting'); el.remove(); }, 1100);
    };
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      if (pct) pct.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      if (p < 1 && !finished) requestAnimationFrame(step);
      else finish();
    };
    requestAnimationFrame(step);
    el.addEventListener('click', finish);
  }

  boot(() => {
    lenis && lenis.start();
    if (animated) {
      heroIntro();
      initScrollMotion();
      if (location.hash) {
        const t = d.getElementById(location.hash.slice(1));
        t && setTimeout(() => scrollToTarget(t), 400);
      }
    } else {
      staticFallbacks();
    }
  });
})();
