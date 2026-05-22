document.addEventListener('DOMContentLoaded', () => {
  // ─── Navbar scroll effect ───
  const nav = document.getElementById('main-nav');
  const handleNavScroll = () => {
    if (window.scrollY > 100) nav.classList.add('nav-scrolled');
    else nav.classList.remove('nav-scrolled');
  };
  window.addEventListener('scroll', handleNavScroll, { passive: true });

  // ─── Active nav link (robust detection) ───
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    const linkPage = link.getAttribute('href').split('/').pop().split('#')[0];
    if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
      link.classList.add('active');
    }
  });
  document.querySelectorAll('.mobile-overlay .nav-item').forEach(link => {
    const linkPage = link.getAttribute('href').split('/').pop().split('#')[0];
    if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ─── Mobile bottom sheet menu ───
  const mobileBtn = document.getElementById('mobile-btn');
  const mobileClose = document.getElementById('mobile-close');
  const mobileOverlay = document.getElementById('mobile-overlay');

  if (mobileBtn && mobileOverlay) {
    mobileBtn.addEventListener('click', () => {
      mobileOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    const closeMenu = () => {
      mobileOverlay.classList.remove('open');
      document.body.style.overflow = '';
    };

    if (mobileClose) mobileClose.addEventListener('click', closeMenu);
    mobileOverlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMenu);
    });

    // Drag-to-dismiss
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    const dragHandle = mobileOverlay.querySelector('.drag-handle');

    if (dragHandle) {
      dragHandle.addEventListener('touchstart', (e) => {
        isDragging = true;
        startY = e.touches[0].clientY;
      }, { passive: true });

      mobileOverlay.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > 0) {
          mobileOverlay.style.transform = `translateY(${diff}px)`;
          mobileOverlay.style.transition = 'none';
        }
      }, { passive: true });

      mobileOverlay.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        const diff = currentY - startY;
        mobileOverlay.style.transition = '';
        if (diff > 120) {
          closeMenu();
        } else {
          mobileOverlay.style.transform = '';
        }
      }, { passive: true });
    }
  }

  // ─── Staggered scroll reveal ───
  const staggerDelay = 100;
  const revealObs = new IntersectionObserver((entries) => {
    const visibleEntries = entries.filter(e => e.isIntersecting);
    visibleEntries.forEach((entry, i) => {
      const delay = entry.target.dataset.delay
        ? parseInt(entry.target.dataset.delay)
        : i * staggerDelay;
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, delay);
      revealObs.unobserve(entry.target);
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-scale, .reveal-bounce').forEach(el => {
    revealObs.observe(el);
  });

  // ─── Counter animation ───
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = el.dataset.count;
      if (!target) return;

      const isNumber = /^\d+$/.test(target.replace(/[,+]/g, ''));
      if (isNumber) {
        const num = parseInt(target.replace(/[,+]/g, ''));
        const suffix = target.includes('+') ? '+' : '';
        const hasComma = target.includes(',');
        const duration = 1500;
        const start = performance.now();

        const animate = (now) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.floor(num * eased);
          el.textContent = (hasComma ? current.toLocaleString() : current) + suffix;
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
      el.classList.add('visible');
      counterObs.unobserve(el);
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('[data-count]').forEach(el => counterObs.observe(el));

  // ─── Sticky bottom action bar (mobile) ───
  const bottomBar = document.getElementById('bottom-action-bar');
  if (bottomBar) {
    const footer = document.querySelector('footer');
    let lastScrollY = 0;

    const updateBottomBar = () => {
      if (!footer) return;
      const footerRect = footer.getBoundingClientRect();
      const isNearFooter = footerRect.top < window.innerHeight;
      const scrollingDown = window.scrollY > lastScrollY;
      lastScrollY = window.scrollY;

      if (window.scrollY < 300) {
        bottomBar.classList.add('hidden');
      } else if (isNearFooter) {
        bottomBar.classList.add('hidden');
      } else {
        bottomBar.classList.remove('hidden');
      }
    };

    window.addEventListener('scroll', updateBottomBar, { passive: true });
    updateBottomBar();
  }

  // ─── Contact form mailto ───
  const handleFormSubmit = (form, nameId, phoneId, serviceId, msgId) => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const name = document.getElementById(nameId).value;
      const phoneInput = document.getElementById(phoneId);
      const phoneDigits = phoneInput.value.replace(/\D/g, '');

      if (phoneDigits.length < 10) {
        alert('Please check your phone number and fill it out properly. (10 digits required)');
        phoneInput.focus();
        return;
      }

      const service = document.getElementById(serviceId).value;
      const message = document.getElementById(msgId).value;
      const subject = encodeURIComponent('Service Request from ' + name + ' - ' + service);
      const body = encodeURIComponent('Name: ' + name + '\nPhone: ' + phoneInput.value + '\nService Needed: ' + service + '\n\nMessage:\n' + message);

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const mailtoUrl = 'mailto:COMTEC_ZION@YAHOO.COM?subject=' + subject + '&body=' + body;

      if (isMobile) {
        window.location.href = mailtoUrl;
      } else {
        const gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=COMTEC_ZION@YAHOO.COM&su=' + subject + '&body=' + body;
        window.open(gmailUrl, '_blank');
      }
    });
  };

  const contactForm = document.getElementById('contact-form');
  const quoteForm = document.getElementById('quote-form');
  if (contactForm) handleFormSubmit(contactForm, 'cf-name', 'cf-phone', 'cf-service', 'cf-message');
  if (quoteForm) handleFormSubmit(quoteForm, 'qf-name', 'qf-phone', 'qf-service', 'qf-message');

  // ─── Phone number auto-formatter ───
  document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener('input', (e) => {
      let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
      if (!x[2]) {
        e.target.value = x[1];
      } else if (!x[3]) {
        e.target.value = `(${x[1]}) ${x[2]}`;
      } else {
        e.target.value = `(${x[1]}) ${x[2]}-${x[3]}`;
      }
    });
  });

  // ─── Marquee duplication ───
  const marqueeTrack = document.querySelector('.marquee-track');
  if (marqueeTrack) {
    const clone = marqueeTrack.innerHTML;
    marqueeTrack.innerHTML = clone + clone;

    marqueeTrack.addEventListener('touchstart', () => {
      marqueeTrack.style.animationPlayState = 'paused';
    }, { passive: true });
    marqueeTrack.addEventListener('touchend', () => {
      marqueeTrack.style.animationPlayState = 'running';
    }, { passive: true });
  }

  // ─── Dynamic availability badge ───
  const availDot = document.getElementById('avail-dot');
  const availLabel = document.getElementById('avail-label');
  const availHours = document.getElementById('avail-hours');
  const availCard = document.getElementById('availability-card');

  if (availDot && availLabel && availHours) {
    const schedule = {
      1: { open: 8, close: 19, label: 'Mon' },
      2: { open: 8, close: 19, label: 'Tue' },
      3: { open: 8, close: 19, label: 'Wed' },
      4: { open: 8, close: 19, label: 'Thu' },
      5: { open: 8, close: 19, label: 'Fri' },
      6: { open: 9, close: 18, label: 'Sat' },
      0: null
    };

    function formatHour(h) {
      if (h === 0 || h === 12) return (h === 0 ? '12' : '12') + (h < 12 ? 'AM' : 'PM');
      return (h > 12 ? h - 12 : h) + (h >= 12 ? 'PM' : 'AM');
    }

    function updateAvailability(jamaicaDate) {
      const day = jamaicaDate.getDay();
      const hour = jamaicaDate.getHours();
      const mins = jamaicaDate.getMinutes();
      const info = schedule[day];

      if (!info) {
        availDot.classList.add('closed');
        availLabel.style.color = '#EF4444';
        availLabel.textContent = 'CLOSED TODAY';
        availHours.textContent = 'Sunday - Back Monday 8AM';
        if (availCard) availCard.style.borderColor = 'rgba(239,68,68,0.3)';
        return;
      }

      const currentDecimal = hour + mins / 60;
      const isOpen = currentDecimal >= info.open && currentDecimal < info.close;
      const dayLabel = info.label;
      const hoursText = formatHour(info.open) + ' - ' + formatHour(info.close);

      if (isOpen) {
        const minsLeft = Math.floor((info.close - currentDecimal) * 60);
        availDot.classList.remove('closed');
        availLabel.style.color = '#10B981';
        availLabel.textContent = 'OPEN NOW';
        if (minsLeft <= 60) {
          availHours.textContent = dayLabel + ' ' + hoursText + ' · Closes in ' + minsLeft + 'min';
        } else {
          availHours.textContent = dayLabel + ' ' + hoursText + ' · Closes ' + formatHour(info.close);
        }
        if (availCard) availCard.style.borderColor = 'rgba(16,185,129,0.3)';
      } else {
        availDot.classList.add('closed');
        availLabel.style.color = '#EF4444';
        availLabel.textContent = 'CLOSED NOW';

        let nextDay = day;
        let nextInfo = null;
        for (let i = 0; i < 7; i++) {
          nextDay = (day + (currentDecimal < (info ? info.open : 0) && i === 0 ? 0 : i + (currentDecimal >= (info ? info.open : 0) ? 1 : 0))) % 7;
          if (i === 0 && currentDecimal < info.open) { nextDay = day; nextInfo = info; break; }
          nextDay = (day + i + 1) % 7;
          if (schedule[nextDay]) { nextInfo = schedule[nextDay]; break; }
        }

        if (currentDecimal < info.open) {
          availHours.textContent = dayLabel + ' ' + hoursText + ' · Opens ' + formatHour(info.open);
        } else if (nextInfo) {
          const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
          availHours.textContent = 'Opens ' + dayNames[nextDay] + ' ' + formatHour(nextInfo.open) + ' · ' + formatHour(nextInfo.open) + '–' + formatHour(nextInfo.close);
        }
        if (availCard) availCard.style.borderColor = 'rgba(239,68,68,0.3)';
      }
    }

    function getJamaicaTimeFallback() {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      return new Date(utc - 5 * 3600000);
    }

    async function fetchJamaicaTime() {
      try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/America/Jamaica', { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const data = await res.json();
          return new Date(data.datetime);
        }
      } catch (e) {}

      try {
        const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=America/Jamaica', { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const data = await res.json();
          return new Date(data.year, data.month - 1, data.day, data.hour, data.minute, data.seconds);
        }
      } catch (e) {}

      return getJamaicaTimeFallback();
    }

    fetchJamaicaTime().then(updateAvailability);
    setInterval(() => updateAvailability(getJamaicaTimeFallback()), 60000);
  }

  // ─── Back to top ───
  const btt = document.getElementById('back-to-top');
  if (btt) {
    window.addEventListener('scroll', () => {
      btt.style.opacity = window.scrollY > 500 ? '1' : '0';
      btt.style.pointerEvents = window.scrollY > 500 ? 'auto' : 'none';
    }, { passive: true });
    btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ─── FAQ Accordion ───
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const wasOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
      });
    }
  });

  // ─── Gallery Filter Tags ───
  const filterTags = document.querySelectorAll('.filter-tag');
  const galleryItems = document.querySelectorAll('.gallery-item');
  if (filterTags.length && galleryItems.length) {
    filterTags.forEach(tag => {
      tag.addEventListener('click', () => {
        filterTags.forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        const filter = tag.dataset.filter;
        galleryItems.forEach(item => {
          if (filter === 'all' || item.dataset.category === filter) {
            item.classList.remove('hidden');
            item.style.position = '';
          } else {
            item.classList.add('hidden');
          }
        });
      });
    });
  }

  // ─── Before/After Slider ───
  document.querySelectorAll('.ba-slider').forEach(slider => {
    const handle = slider.querySelector('.ba-handle');
    const afterImg = slider.querySelector('.ba-after');
    let isDragging = false;

    function updateSlider(x) {
      const rect = slider.getBoundingClientRect();
      let pos = (x - rect.left) / rect.width;
      pos = Math.max(0.05, Math.min(0.95, pos));
      handle.style.left = (pos * 100) + '%';
      afterImg.style.clipPath = `inset(0 0 0 ${pos * 100}%)`;
    }

    slider.addEventListener('mousedown', (e) => { isDragging = true; updateSlider(e.clientX); });
    document.addEventListener('mousemove', (e) => { if (isDragging) updateSlider(e.clientX); });
    document.addEventListener('mouseup', () => { isDragging = false; });
    slider.addEventListener('touchstart', (e) => { isDragging = true; updateSlider(e.touches[0].clientX); }, { passive: true });
    slider.addEventListener('touchmove', (e) => { if (isDragging) updateSlider(e.touches[0].clientX); }, { passive: true });
    slider.addEventListener('touchend', () => { isDragging = false; }, { passive: true });
  });

  // ─── Lead magnet form ───
  const leadForm = document.getElementById('lead-magnet-form');
  if (leadForm) {
    leadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = leadForm.querySelector('input[type="email"]').value;
      if (email) {
        leadForm.innerHTML = '<p style="color:#22C55E;font-weight:600;font-size:18px;">Check your inbox! Your free checklist is on the way.</p>';
      }
    });
  }

  // ─── Lazy map loader ───
  const mapContainer = document.getElementById('mapContainer');
  if (mapContainer) {
    const mapSrc = mapContainer.dataset.mapSrc;
    const loadMapBtn = mapContainer.querySelector('button');
    const loadMap = () => {
      if (!mapSrc || mapContainer.classList.contains('loaded')) return;
      const iframe = document.createElement('iframe');
      iframe.src = mapSrc;
      iframe.width = '100%';
      iframe.height = '320';
      iframe.style.border = '0';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      mapContainer.appendChild(iframe);
      mapContainer.classList.add('loaded');
    };

    if (loadMapBtn) loadMapBtn.addEventListener('click', loadMap);

    const mapObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMap();
        mapObs.disconnect();
      }
    }, { rootMargin: '200px' });
    mapObs.observe(mapContainer);
  }

  // ─── Lazy video loading ───
  document.querySelectorAll('video[data-src]').forEach(video => {
    const videoObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        video.src = video.dataset.src;
        video.load();
        videoObs.disconnect();
      }
    }, { rootMargin: '200px' });
    videoObs.observe(video);
  });
});
