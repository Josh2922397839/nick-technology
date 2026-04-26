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

  // Active nav link
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(l => {
          l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id);
        });
      }
    });
  }, { threshold: 0.3 });
  sections.forEach(s => secObs.observe(s));

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

  // Contact form mailto
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const name = document.getElementById('cf-name').value;
      const phone = document.getElementById('cf-phone').value;
      const service = document.getElementById('cf-service').value;
      const message = document.getElementById('cf-message').value;
      const subject = encodeURIComponent('Service Request from ' + name + ' \u2014 ' + service);
      const body = encodeURIComponent('Name: ' + name + '\nPhone: ' + phone + '\nService Needed: ' + service + '\n\nMessage:\n' + message);
      
      // On mobile, mailto: works perfectly to open the native app
      // On PC, mailto: often fails if no default mail client (like Outlook) is installed, so we route to Gmail web
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        window.location.href = 'mailto:COMTEC_ZION@YAHOO.COM?subject=' + subject + '&body=' + body;
      } else {
        const gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=COMTEC_ZION@YAHOO.COM&su=' + subject + '&body=' + body;
        window.open(gmailUrl, '_blank');
      }
    });
  }

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
