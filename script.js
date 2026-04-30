// Nick Technology V2 — Scripts

document.addEventListener('DOMContentLoaded', () => {
  // Navbar scroll effect
  const nav = document.getElementById('main-nav');
  const handleNavScroll = () => {
    if (window.scrollY > 100) { nav.classList.add('nav-scrolled'); }
    else { nav.classList.remove('nav-scrolled'); }
  };
  window.addEventListener('scroll', handleNavScroll, { passive: true });

  // Mobile menu
  const mobileBtn = document.getElementById('mobile-btn');
  const mobileClose = document.getElementById('mobile-close');
  const mobileOverlay = document.getElementById('mobile-overlay');
  if (mobileBtn && mobileOverlay) {
    mobileBtn.addEventListener('click', () => mobileOverlay.classList.add('open'));
    mobileClose.addEventListener('click', () => mobileOverlay.classList.remove('open'));
    mobileOverlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileOverlay.classList.remove('open'));
    });
  }

  // Scroll reveal
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

  // Active nav link based on current path
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(l => {
    const linkPath = l.getAttribute('href');
    if (linkPath === currentPath || (currentPath === '/' && linkPath === 'index.html')) {
      l.classList.add('active');
    } else {
      l.classList.remove('active');
    }
  });

  // Mobile sticky CTA
  const mobileCta = document.getElementById('mobile-cta');
  if (mobileCta) {
    const hero = document.getElementById('hero');
    const ctaObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) mobileCta.classList.add('visible');
        else mobileCta.classList.remove('visible');
      });
    }, { threshold: 0 });
    if (hero) ctaObs.observe(hero);
  }

  // Contact form mailto (shared across pages)
  const contactForm = document.getElementById('contact-form');
  const quoteForm = document.getElementById('quote-form');

  const handleFormSubmit = (form, nameId, phoneId, serviceId, msgId) => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const name = document.getElementById(nameId).value;
      const phone = document.getElementById(phoneId).value;
      const service = document.getElementById(serviceId).value;
      const message = document.getElementById(msgId).value;
      const subject = encodeURIComponent('Service Request from ' + name + ' \u2014 ' + service);
      const body = encodeURIComponent('Name: ' + name + '\nPhone: ' + phone + '\nService Needed: ' + service + '\n\nMessage:\n' + message);
      
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

  if (contactForm) handleFormSubmit(contactForm, 'cf-name', 'cf-phone', 'cf-service', 'cf-message');
  if (quoteForm) handleFormSubmit(quoteForm, 'qf-name', 'qf-phone', 'qf-service', 'qf-message');

  // Phone number numeric restriction
  const phoneInputs = document.querySelectorAll('input[type="tel"]');
  phoneInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
  });

  // Marquee duplication for seamless loop + touch support
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

  // Dynamic availability badge
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
        availHours.textContent = 'Sunday — Back Monday 8AM';
        if (availCard) availCard.style.borderColor = 'rgba(239,68,68,0.3)';
        return;
      }

      const currentDecimal = hour + mins / 60;
      const isOpen = currentDecimal >= info.open && currentDecimal < info.close;
      const dayLabel = info.label;
      const hoursText = formatHour(info.open) + ' – ' + formatHour(info.close);

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
      // Plan A: WorldTimeAPI
      try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/America/Jamaica', { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const data = await res.json();
          return new Date(data.datetime);
        }
      } catch (e) {}

      // Plan B: TimeAPI.io
      try {
        const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=America/Jamaica', { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const data = await res.json();
          return new Date(data.year, data.month - 1, data.day, data.hour, data.minute, data.seconds);
        }
      } catch (e) {}

      // Plan C: client-side calculation (Jamaica is always UTC-5)
      return getJamaicaTimeFallback();
    }

    fetchJamaicaTime().then(updateAvailability);

    // Re-check every 60 seconds using fallback to avoid hammering APIs
    setInterval(() => updateAvailability(getJamaicaTimeFallback()), 60000);
  }

  // Back to top
  const btt = document.getElementById('back-to-top');
  if (btt) {
    window.addEventListener('scroll', () => {
      btt.style.opacity = window.scrollY > 500 ? '1' : '0';
      btt.style.pointerEvents = window.scrollY > 500 ? 'auto' : 'none';
    }, { passive: true });
    btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
});
