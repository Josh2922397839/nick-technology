// Site behaviour. Loaded as a deferred module and built to one small file.
// Every feature degrades to plain links and static content if this never runs.
// Motion is CSS-only (opacity/transform), started by IntersectionObserver: no scroll handlers.
import {
  jamaicaTime, shopStatus, clock12, pad, quoteProblems, quoteMessage, whatsappLink, emailLink,
} from './core.mjs';

const d = document;
const html = d.documentElement;
const w = window;
const $ = (selector, root = d) => root.querySelector(selector);
const $$ = (selector, root = d) => [...root.querySelectorAll(selector)];
const media = (query) => w.matchMedia(query).matches;

const reduced = media('(prefers-reduced-motion: reduce)');
// Rich effects (tilt, feed switching, autoplaying video, marquee) are for large screens with a mouse.
const desktop = media('(min-width: 1100px) and (hover: hover) and (pointer: fine)');
const connection = navigator.connection || {};
const saveData = Boolean(connection.saveData) || /(^|-)2g$/.test(connection.effectiveType || '');
const idle = w.requestIdleCallback || ((callback) => setTimeout(callback, 1200));
w.__NT = true;

function observe(targets, callback, options) {
  const list = targets.filter(Boolean);
  if (!list.length || !('IntersectionObserver' in w)) return null;
  const io = new IntersectionObserver((entries) => entries.forEach((entry) => callback(entry, io)), options);
  list.forEach((target) => io.observe(target));
  return io;
}

/* ---------- Live shop status, hours and clocks (Jamaica time) ---------- */
function paintStatus() {
  const now = jamaicaTime();
  const status = shopStatus(now);
  for (const el of $$('[data-status]')) {
    el.dataset.state = status.state;
    const text = $('[data-status-text]', el);
    if (text) text.textContent = status.text;
  }
  $$('[data-status-sub]').forEach((el) => { el.textContent = status.sub; });
  $$('[data-status-cta]').forEach((el) => { el.textContent = status.cta; });
  $$('[data-hours] li').forEach((li) => li.classList.toggle('is-today', Number(li.dataset.day) === now.day));
  const clock = clock12(now.h * 60 + now.m);
  $$('[data-clock]').forEach((el) => { el.textContent = clock; });
}
paintStatus();
setInterval(() => d.hidden || paintStatus(), 30000);
d.addEventListener('visibilitychange', () => d.hidden || paintStatus());

/* ---------- Call / WhatsApp click tracking (GA4 or GTM pick these up if installed) ---------- */
d.addEventListener('click', (event) => {
  const link = event.target.closest && event.target.closest('a[href^="tel:"], a[href*="wa.me/"], a[href^="mailto:"]');
  if (!link) return;
  const kind = link.protocol === 'tel:' ? 'call' : link.protocol === 'mailto:' ? 'email' : 'whatsapp';
  const place = link.dataset.track || `${kind}_${link.closest('[id]')?.id || 'page'}`;
  (w.dataLayer = w.dataLayer || []).push({ event: `${kind}_click`, cta: place, page: location.pathname });
  if (typeof w.gtag === 'function') w.gtag('event', `${kind}_click`, { cta: place });
}, true);

/* ---------- Header background once the page scrolls (sentinel, no scroll listener) ---------- */
const nav = $('[data-nav]');
if (nav) {
  const sentinel = d.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:40px;pointer-events:none;visibility:hidden';
  d.body.prepend(sentinel);
  observe([sentinel], (entry) => nav.classList.toggle('is-scrolled', !entry.isIntersecting));
}

/* ---------- Mobile menu ---------- */
const burger = $('[data-burger]');
const menu = $('[data-menu]');
if (burger && menu) {
  const background = [$('#main'), $('.footer'), $('[data-dock]'), $('.fab')].filter(Boolean);
  const isOpen = () => html.classList.contains('menu-open');
  let hideTimer = 0;
  const setMenu = (open, restoreFocus = true) => {
    clearTimeout(hideTimer);
    html.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    background.forEach((el) => { el.inert = open; });
    if (open) {
      menu.hidden = false;
      void menu.offsetWidth; // commit the closed state so the fade-in runs
      menu.classList.add('is-open');
      $('a', menu).focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      hideTimer = setTimeout(() => { menu.hidden = true; }, reduced ? 0 : 240);
      if (restoreFocus) burger.focus({ preventScroll: true });
    }
  };
  burger.addEventListener('click', () => setMenu(!isOpen()));
  menu.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false, false); });
  d.addEventListener('keydown', (event) => {
    if (!isOpen()) return;
    if (event.key === 'Escape') { setMenu(false); return; }
    if (event.key !== 'Tab') return;
    const focusable = [burger, ...$$('a[href]', menu)];
    const index = focusable.indexOf(d.activeElement);
    event.preventDefault();
    focusable[(index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
  });
  w.matchMedia('(min-width: 1100px)').addEventListener('change', (event) => {
    if (event.matches && isOpen()) setMenu(false, false);
  });
}

/* ---------- Sticky call dock: appears once the main call button scrolls away ---------- */
const heroCta = $('[data-hero-cta]');
if (heroCta && 'IntersectionObserver' in w) observe([heroCta], (entry) => html.classList.toggle('dock-on', !entry.isIntersecting));
else html.classList.add('dock-on');

/* ---------- Scroll reveals ---------- */
if (!reduced && 'IntersectionObserver' in w) {
  const items = [...$$('[data-reveal]'), ...$$('[data-stagger] > *')];
  const limit = innerHeight * 0.92;
  // Anything already on screen stays visible: no flash on slow devices where JS runs after first paint.
  const onScreen = new Set(items.filter((el) => {
    const box = el.getBoundingClientRect();
    return box.height > 0 && box.top < limit && box.bottom > 0;
  }));
  onScreen.forEach((el) => el.classList.add('is-in'));
  html.classList.add('motion');
  const io = new IntersectionObserver((entries) => {
    let order = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      io.unobserve(el);
      const delay = Math.min(order++, 5) * 70;
      el.style.setProperty('--d', `${delay}ms`);
      el.classList.add('is-in', 'is-revealing');
      setTimeout(() => { el.classList.remove('is-revealing'); el.style.removeProperty('--d'); }, 900 + delay);
    }
  }, { rootMargin: '0px 0px -6% 0px' });
  items.forEach((el) => { if (!onScreen.has(el)) io.observe(el); });
}

/* ---------- Continuous animations only run while their section is on screen ---------- */
observe($$('[data-live]'), (entry) => entry.target.classList.toggle('is-live', entry.isIntersecting), { rootMargin: '120px 0px' });

/* ---------- Count-up numbers ---------- */
function countUp(el) {
  const end = parseFloat(el.dataset.count);
  const decimals = Number(el.dataset.decimals || 0);
  const format = (value) => (el.dataset.format === 'comma' ? Math.round(value).toLocaleString('en-US') : value.toFixed(decimals));
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - start) / 1300);
    el.textContent = format(end * (1 - (1 - progress) ** 3));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
if (!reduced) {
  observe($$('[data-count]'), (entry, io) => {
    if (!entry.isIntersecting) return;
    io.unobserve(entry.target);
    countUp(entry.target);
  }, { threshold: 0.6 });
}

/* ---------- Home hero: camera wall ---------- */
const hero = $('[data-hero]');
if (hero) {
  const stamps = $$('[data-feed-time]', hero);
  const drawTime = (seconds) => {
    const t = jamaicaTime();
    const text = `${pad(t.h)}:${pad(t.m)}${seconds ? `:${pad(t.s)}` : ''}`;
    stamps.forEach((el) => { el.textContent = text; });
  };
  drawTime(false);
  if (desktop && !reduced) enhanceHero(hero, drawTime);
  else setInterval(() => d.hidden || drawTime(false), 30000);
}

function enhanceHero(root, drawTime) {
  let visible = true;
  observe([root], (entry) => { visible = entry.isIntersecting; });
  setInterval(() => { if (visible && !d.hidden) drawTime(true); }, 1000);

  // Gentle 3D tilt that follows the mouse.
  const wall = $('[data-wall]', root);
  let frame = 0;
  let x = 0;
  let y = 0;
  root.addEventListener('pointermove', (event) => {
    x = event.clientX / innerWidth - 0.5;
    y = event.clientY / innerHeight - 0.5;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      wall.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
      wall.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`);
    });
  });
  root.addEventListener('pointerleave', () => {
    wall.style.setProperty('--ry', '0deg');
    wall.style.setProperty('--rx', '0deg');
  });

  // One live video tile (never on phones or data-saver connections).
  const videoFeed = $('[data-feed-video]', root);
  if (videoFeed && !saveData) {
    const video = d.createElement('video');
    Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'none' });
    video.setAttribute('muted', '');
    video.setAttribute('aria-hidden', 'true');
    video.poster = $('img', videoFeed).currentSrc;
    video.src = videoFeed.dataset.feedVideo;
    videoFeed.insertBefore(video, $('figcaption', videoFeed));
    observe([videoFeed], (entry) => {
      if (entry.isIntersecting && !d.hidden) video.play().catch(() => {});
      else video.pause();
    });
  }

  // Feeds occasionally "switch camera", like a real monitoring wall.
  const pool = [
    ['wall-coast', 'Command room'], ['wall-live', 'Street view'], ['install-pole', 'Perimeter'],
    ['install-camera', 'On site'], ['install-ladder', 'Install crew'], ['nicholas-shop', 'Front desk'],
    ['on-site', 'Site survey'], ['forza-titan-700', 'Power bay'], ['solar-panel', 'Solar bench'], ['wall-mounted', 'Wall 02'],
  ].map(([file, name]) => ({ src: `/assets/img/${file}-feed.webp`, name }));
  const feeds = $$('.feed', root).filter((feed) => !feed.hasAttribute('data-feed-video'));
  idle(() => pool.forEach((item) => { new Image().src = item.src; }));
  setInterval(() => {
    if (!visible || d.hidden) return;
    const feed = feeds[Math.floor(Math.random() * feeds.length)];
    const used = new Set(feeds.map((f) => new URL($('img', f).src).pathname));
    const options = pool.filter((item) => !used.has(item.src));
    const next = options[Math.floor(Math.random() * options.length)];
    if (!next) return;
    feed.classList.add('is-switching');
    setTimeout(() => {
      const img = $('img', feed);
      img.src = next.src;
      img.alt = `Camera feed: ${next.name}`;
      const name = $('.feed__name', feed);
      if (name) name.textContent = next.name;
    }, 150);
    setTimeout(() => feed.classList.remove('is-switching'), 420);
  }, 3200);
}

/* ---------- Install sequence: auto-advances while visible, tap a stage to take over ---------- */
const seq = $('[data-seq]');
if (seq) {
  const images = $$('[data-seq-img]', seq);
  const steps = $$('[data-seq-step]', seq);
  const screen = $('.seq__screen', seq);
  const count = $('[data-seq-count]', seq);
  const label = $('[data-seq-label]', seq);
  const titles = steps.map((step) => $('.seq__title', step).textContent);
  const STEP_MS = 3600;
  let current = 0;
  let timer = 0;
  let cleanup = 0;
  let auto = !reduced;
  seq.style.setProperty('--step', `${STEP_MS}ms`);

  const show = (index) => {
    if (index === current) return;
    clearTimeout(cleanup);
    images.forEach((frame) => frame.classList.remove('is-prev', 'is-wipe'));
    images[current].classList.add('is-prev');
    images[index].classList.add('is-on');
    if (!reduced) {
      void images[index].offsetWidth; // restart the wipe if this frame animated moments ago
      images[index].classList.add('is-wipe');
    }
    cleanup = setTimeout(() => {
      images.forEach((frame, i) => {
        frame.classList.toggle('is-on', i === index);
        frame.classList.remove('is-prev', 'is-wipe');
      });
    }, reduced ? 0 : 950);
    current = index;
    steps.forEach((step, i) => {
      step.classList.toggle('is-active', i === index);
      step.setAttribute('aria-pressed', String(i === index));
    });
    if (count) count.textContent = pad(index + 1);
    if (label) label.textContent = titles[index];
  };
  const pause = () => { clearInterval(timer); timer = 0; seq.classList.remove('is-auto'); };
  const play = () => {
    if (!auto || timer) return;
    seq.classList.add('is-auto');
    timer = setInterval(() => show((current + 1) % images.length), STEP_MS);
  };
  steps.forEach((step, i) => step.addEventListener('click', () => { auto = false; pause(); show(i); }));
  observe([screen], (entry) => (entry.isIntersecting ? play() : pause()), { threshold: 0.45 });
}

/* ---------- Reviews: seamless loop on desktop; phones get a swipeable row ---------- */
const marquee = $('[data-marquee]');
if (marquee && desktop && !reduced) {
  const track = $('.marquee__track', marquee);
  [...track.children].forEach((card) => {
    const copy = card.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    track.append(copy);
  });
  track.style.setProperty('--dur', `${track.children.length * 4}s`);
  marquee.classList.add('is-looping');
}

/* ---------- Video reels: tap to play (phones never download video until asked) ---------- */
const reels = $$('[data-reel]');
// Posters load when their section nears the screen. (Native lazy-loading misfires inside
// horizontal scrollers in skipped sections, fetching them on page load.)
const showPosters = (root) => $$('.reel__poster[data-src]', root).forEach((img) => { img.src = img.dataset.src; });
if (!('IntersectionObserver' in w)) showPosters(d);
observe([...new Set(reels.map((reel) => reel.closest('section')))], (entry, io) => {
  if (!entry.isIntersecting) return;
  io.unobserve(entry.target);
  showPosters(entry.target);
}, { rootMargin: '600px 0px' });
const soundIcon = (button, on) => {
  $('use', button).setAttribute('href', on ? '#i-sound' : '#i-mute');
  button.setAttribute('aria-label', on ? 'Mute' : 'Turn sound on');
};
const loadVideo = (video) => {
  if (!video.getAttribute('src') && video.dataset.src) video.src = video.dataset.src;
};
reels.forEach((reel) => {
  const video = $('video', reel);
  const playButton = $('[data-reel-play]', reel);
  const soundButton = $('[data-reel-sound]', reel);
  const title = (playButton.getAttribute('aria-label') || '').replace(/^Play video: /, '');
  const start = () => {
    loadVideo(video);
    if (!desktop) reels.forEach((other) => { const v = $('video', other); if (v !== video) v.pause(); });
    video.play().catch(() => {});
  };
  const update = () => {
    const playing = !video.paused;
    reel.classList.toggle('is-playing', playing);
    if (playing) reel.classList.add('has-played');
    playButton.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} video: ${title}`);
    $('use', playButton).setAttribute('href', playing ? '#i-pause' : '#i-play');
  };
  playButton.addEventListener('click', () => (video.paused ? start() : video.pause()));
  video.addEventListener('play', update);
  video.addEventListener('pause', update);
  if (soundButton) {
    soundButton.addEventListener('click', () => {
      const turnOn = video.muted;
      reels.forEach((other) => {
        $('video', other).muted = true;
        const button = $('[data-reel-sound]', other);
        if (button) soundIcon(button, false);
      });
      video.muted = !turnOn;
      soundIcon(soundButton, turnOn);
      if (turnOn) start();
    });
  }
});
if (desktop && !reduced && !saveData) {
  observe(reels.map((reel) => $('video', reel)), (entry) => {
    const video = entry.target;
    if (entry.isIntersecting && !d.hidden) { loadVideo(video); video.play().catch(() => {}); } else video.pause();
  }, { threshold: 0.35 });
}
d.addEventListener('visibilitychange', () => { if (d.hidden) $$('video').forEach((video) => video.pause()); });

/* ---------- Quote forms open WhatsApp (or email) with the message filled in ---------- */
$$('[data-wa-form]').forEach((form) => form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const values = {
    name: String(data.get('name') || ''),
    phone: String(data.get('phone') || ''),
    service: String(data.get('service') || ''),
    message: String(data.get('message') || ''),
  };
  const error = $('[data-form-error]', form);
  $$('.field', form).forEach((field) => field.classList.remove('is-invalid'));
  const problems = quoteProblems(values);
  if (problems.length) {
    problems.forEach((name) => form.elements[name].closest('.field').classList.add('is-invalid'));
    if (error) error.textContent = 'Please add your name and a phone number we can reach you on.';
    form.elements[problems[0]].focus();
    return;
  }
  if (error) error.textContent = '';
  const text = quoteMessage(values);
  const viaEmail = event.submitter && event.submitter.dataset.via === 'email';
  (w.dataLayer = w.dataLayer || []).push({ event: viaEmail ? 'quote_email' : 'quote_whatsapp', service: values.service });
  if (viaEmail) location.href = emailLink(`Quote request: ${values.service || 'General'}`, text);
  else w.open(whatsappLink(text), '_blank', 'noopener');
}));

/* ---------- Map loads only on request ---------- */
$$('[data-map-load]').forEach((button) => button.addEventListener('click', () => {
  const frame = d.createElement('iframe');
  Object.assign(frame, {
    src: 'https://maps.google.com/maps?q=Nick%20technology%20group%20Portmore%20Jamaica&z=15&output=embed',
    title: 'Map showing Nick Technology in Portmore',
    loading: 'lazy',
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFullscreen: true,
  });
  button.closest('[data-map]').replaceChildren(frame);
}));

/* ---------- Copy buttons ---------- */
$$('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(button.dataset.copy);
    const label = $('[data-copy-label]', button);
    if (!label) return;
    const previous = label.textContent;
    label.textContent = 'Copied';
    button.classList.add('is-copied');
    setTimeout(() => { label.textContent = previous; button.classList.remove('is-copied'); }, 1600);
  } catch { /* clipboard blocked: the text is still visible and selectable */ }
}));

/* ---------- Before / after slider (native range input for touch and keyboard) ---------- */
$$('[data-ba]').forEach((ba) => {
  const range = $('input[type="range"]', ba);
  const set = (value) => ba.style.setProperty('--pos', `${value}%`);
  let touched = false;
  range.addEventListener('input', () => { touched = true; set(range.value); });
  set(range.value);
  if (reduced) return;
  observe([ba], (entry, io) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    // A short "try me" sweep so people notice it can be dragged.
    const keys = [[0, 50], [700, 30], [1700, 70], [2400, 50]];
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
    let start = 0;
    const step = (now) => {
      if (touched) return;
      start ||= now;
      const t = now - start;
      let i = 0;
      while (i < keys.length - 2 && t >= keys[i + 1][0]) i += 1;
      const [t0, v0] = keys[i];
      const [t1, v1] = keys[i + 1];
      const value = v0 + (v1 - v0) * ease(Math.min(1, (t - t0) / (t1 - t0)));
      range.value = value;
      set(value);
      if (t < keys[keys.length - 1][0]) requestAnimationFrame(step);
    };
    setTimeout(() => requestAnimationFrame(step), 300);
  }, { threshold: 0.5 });
});

/* ---------- Filterable lists (services, gallery) ---------- */
$$('[data-filter-bar]').forEach((bar) => {
  const scope = d.getElementById(bar.dataset.filterBar) || d;
  const items = $$('[data-cat]', scope);
  const count = $('[data-filter-count]', bar);
  bar.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-filter]');
    if (!button) return;
    $$('button[data-filter]', bar).forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    const filter = button.dataset.filter;
    let shown = 0;
    scope.classList.add('is-filtered'); // newly shown items fade in via CSS
    items.forEach((item) => {
      const show = filter === 'all' || item.dataset.cat.split(' ').includes(filter);
      item.hidden = !show;
      if (show) shown += 1;
    });
    if (count) count.textContent = shown;
  });
});

/* ---------- Service rows: photo preview follows the mouse (desktop) ---------- */
const preview = $('[data-hover-preview]');
if (preview && desktop) {
  const img = $('img', preview);
  let frame = 0;
  let px = 0;
  let py = 0;
  const place = () => { frame = 0; preview.style.transform = `translate3d(${px + 24}px, ${py - 90}px, 0)`; };
  $$('[data-preview-img]').forEach((row) => {
    row.addEventListener('pointerenter', () => { img.src = row.dataset.previewImg; preview.classList.add('is-on'); });
    row.addEventListener('pointerleave', () => preview.classList.remove('is-on'));
    row.addEventListener('pointermove', (event) => {
      px = event.clientX;
      py = event.clientY;
      if (!frame) frame = requestAnimationFrame(place);
    });
  });
}

/* ---------- Gallery lightbox ---------- */
const lightbox = $('[data-lightbox]');
if (lightbox) {
  const image = $('[data-lb-img]', lightbox);
  const caption = $('[data-lb-cap]', lightbox);
  const counter = $('[data-lb-count]', lightbox);
  const figures = $$('[data-lb]');
  let list = [];
  let index = 0;
  image.addEventListener('load', () => {
    image.classList.toggle('is-small', image.naturalWidth < 600);
    image.classList.add('is-shown');
  });
  const show = (i) => {
    index = (i + list.length) % list.length;
    const figure = list[index];
    const thumb = $('img', figure);
    image.classList.remove('is-shown');
    image.src = figure.dataset.lb || thumb.currentSrc || thumb.src;
    image.alt = thumb.alt;
    caption.textContent = thumb.alt;
    counter.textContent = `${pad(index + 1)} / ${pad(list.length)}`;
  };
  figures.forEach((figure) => figure.addEventListener('click', () => {
    list = figures.filter((f) => !f.hidden);
    lightbox.showModal();
    show(list.indexOf(figure));
  }));
  $('[data-lb-prev]', lightbox).addEventListener('click', () => show(index - 1));
  $('[data-lb-next]', lightbox).addEventListener('click', () => show(index + 1));
  $('[data-lb-close]', lightbox).addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close(); });
  lightbox.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(index - 1);
    if (event.key === 'ArrowRight') show(index + 1);
  });
  let startX = 0;
  lightbox.addEventListener('touchstart', (event) => { startX = event.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (event) => {
    const dx = event.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
  });
}

/* ---------- Blog reader ---------- */
const reader = $('[data-reader]');
if (reader) {
  const body = $('[data-reader-body]', reader);
  $$('[data-post]').forEach((button) => button.addEventListener('click', () => {
    const template = d.getElementById(`post-${button.dataset.post}`);
    if (!template) return;
    body.replaceChildren(template.content.cloneNode(true));
    reader.showModal();
    reader.scrollTop = 0;
  }));
  $$('[data-reader-close]', reader).forEach((button) => button.addEventListener('click', () => reader.close()));
  reader.addEventListener('click', (event) => { if (event.target === reader) reader.close(); });
}

/* ---------- About page: the sticky photo follows the chapter being read ---------- */
const chapters = $('[data-chapters]');
if (chapters) {
  const photos = $$('[data-chapter-img]', chapters);
  const items = $$('[data-chapter]', chapters);
  const tag = $('[data-chapter-tag]', chapters);
  observe(items, (entry) => {
    if (!entry.isIntersecting) return;
    const i = items.indexOf(entry.target);
    photos.forEach((photo, k) => photo.classList.toggle('is-on', k === i));
    if (tag) tag.textContent = entry.target.dataset.chapter;
  }, { rootMargin: '-45% 0px -45% 0px' });
}

/* ---------- Spotlight glow under the mouse (desktop) ---------- */
if (desktop) {
  let frame = 0;
  let target = null;
  let ex = 0;
  let ey = 0;
  d.addEventListener('pointermove', (event) => {
    target = event.target.closest && event.target.closest('[data-spot]');
    if (!target) return;
    ex = event.clientX;
    ey = event.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!target) return;
      const box = target.getBoundingClientRect();
      target.style.setProperty('--mx', `${ex - box.left}px`);
      target.style.setProperty('--my', `${ey - box.top}px`);
    });
  }, { passive: true });
}
