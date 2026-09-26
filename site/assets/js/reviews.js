(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const form = $('#review-form');
  if (!form) return;
  let reviews = [], photos = [], adminKey = '', pendingDelete = null;
  let processingPhotos = false, posting = false, configuration = null, widgetId = null, token = '';
  const grid = $('#customer-reviews');
  const feedback = $('#review-feedback');
  const photoError = $('#review-photo-error');
  const submit = $('#review-submit');
  const fileInput = $('#review-photos');
  const manager = $('#review-manage');
  const signout = $('#review-signout');
  // Retire the old site's indefinitely stored admin credential.
  try { localStorage.removeItem('adminSecret'); } catch (_) { /* storage may be disabled */ }
  const setFeedback = (message, error = false) => { feedback.textContent = message; feedback.classList.toggle('is-error', error); };
  function setSubmitState() {
    submit.disabled = !configuration || posting || processingPhotos;
    submit.textContent = posting ? 'Publishing…' : processingPhotos ? 'Preparing photos…' : configuration ? 'Publish review' : 'Loading reviews…';
  }
  async function api(path, options = {}) {
    const response = await fetch(path, { cache: 'no-store', ...options });
    let data;
    try { data = await response.json(); } catch { throw new Error('Reviews are unavailable right now. Please try again.'); }
    if (!response.ok) {
      const error = new Error(data.error || 'Unable to complete this request.');
      error.status = response.status;
      throw error;
    }
    return data;
  }
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  function safePhoto(value) {
    return typeof value === 'string' && (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) || /^https:\/\//.test(value) || /^\/?(?:images|assets\/img)\//.test(value));
  }
  function render() {
    grid.replaceChildren();
    $('#review-count').textContent = `${reviews.length} customer review${reviews.length === 1 ? '' : 's'}`;
    manager.textContent = adminKey ? 'Management unlocked' : 'Manage reviews';
    manager.disabled = Boolean(adminKey);
    signout.hidden = !adminKey;
    if (!reviews.length) grid.append(make('p', 'muted', 'Be the first to share your experience here.'));
    for (const review of reviews) {
      const card = make('article', 'review');
      const stars = make('div', 'stars', '★'.repeat(Math.max(0, Math.min(5, Number(review.rating) || 0))));
      stars.setAttribute('aria-label', `${review.rating} out of 5 stars`);
      card.append(stars, make('blockquote', '', review.text));
      const images = Array.isArray(review.images) ? review.images : review.image ? [review.image] : [];
      const gallery = make('div', 'review__photos');
      for (const src of images.filter(safePhoto)) {
        const button = make('button', 'review__photo');
        button.type = 'button';
        button.setAttribute('aria-label', `View photo from ${review.name}'s review`);
        const image = make('img');
        image.src = src;
        image.alt = `Photo shared by ${review.name}`;
        image.loading = 'lazy';
        button.append(image);
        button.addEventListener('click', () => {
          $('#review-full-photo').src = src;
          $('#review-full-photo').alt = image.alt;
          $('#review-photo-dialog').showModal();
        });
        gallery.append(button);
      }
      if (gallery.children.length) card.append(gallery);
      const footer = make('footer');
      const avatar = make('span', 'avatar', review.initials || review.name.slice(0, 2).toUpperCase());
      const author = make('span');
      const date = new Date(`${review.date}T12:00:00`);
      author.append(make('b', '', review.name), make('small', '', Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-JM', { year: 'numeric', month: 'short', day: 'numeric' })));
      footer.append(avatar, author);
      card.append(footer);
      if (adminKey) {
        const button = make('button', 'pill-btn review__delete', 'Delete review');
        button.type = 'button';
        button.setAttribute('aria-label', `Delete review by ${review.name}`);
        button.addEventListener('click', () => {
          pendingDelete = review;
          $('#review-delete-description').textContent = `This permanently removes ${review.name}'s review and photos from the website.`;
          $('#review-delete-error').textContent = '';
          $('#review-delete-dialog').showModal();
        });
        card.append(button);
      }
      grid.append(card);
    }
    window.ScrollTrigger?.refresh();
  }
  async function loadReviews() {
    try {
      const data = await api('/api/reviews');
      if (!Array.isArray(data)) throw new Error('Unable to load reviews.');
      reviews = data;
      $('#reviews-load-status').textContent = '';
      render();
    } catch (error) {
      $('#reviews-load-status').textContent = `${error.message} Use “Reload reviews” to try again.`;
    }
  }
  $('#review-reload').addEventListener('click', loadReviews);
  function renderPreviews() {
    const previews = $('#review-photo-previews');
    previews.replaceChildren();
    photos.forEach((photo, index) => {
      const item = make('div', 'review-photo-preview');
      const img = make('img'); img.src = photo; img.alt = `Selected photo ${index + 1}`;
      const remove = make('button', 'pill-btn', 'Remove'); remove.type = 'button';
      remove.setAttribute('aria-label', `Remove photo ${index + 1}`);
      remove.disabled = posting || processingPhotos;
      remove.addEventListener('click', () => { photos.splice(index, 1); photoError.textContent = ''; renderPreviews(); });
      item.append(img, remove); previews.append(item);
    });
  }
  async function compressPhoto(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose JPEG, PNG or WebP photos.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Each photo must be 5 MB or smaller.');
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.78, 0.65, 0.5, 0.35]) {
        const data = canvas.toDataURL('image/jpeg', quality);
        if (data.length <= 250000) return data;
      }
      throw new Error('This photo is too detailed. Please choose a smaller image.');
    } finally { bitmap.close(); }
  }
  fileInput.addEventListener('change', async () => {
    photoError.textContent = '';
    const files = [...fileInput.files];
    fileInput.value = '';
    if (files.length + photos.length > 3) { photoError.textContent = 'You can attach up to 3 photos. Remove a photo before adding more.'; return; }
    processingPhotos = true; fileInput.disabled = true; setSubmitState(); renderPreviews();
    try { photos.push(...await Promise.all(files.map(compressPhoto))); }
    catch (error) { photoError.textContent = error.message || 'Unable to read this photo. Choose another image.'; }
    finally { processingPhotos = false; fileInput.disabled = false; renderPreviews(); setSubmitState(); }
  });
  function resetSecurity() {
    token = '';
    if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
  }
  async function loadConfiguration() {
    try {
      configuration = await api('/api/reviews/config');
      if (configuration.turnstileRequired) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.onload = () => {
          widgetId = window.turnstile.render('#review-security', { sitekey: configuration.turnstileSiteKey, theme: 'dark', callback: value => { token = value; }, 'expired-callback': () => { token = ''; }, 'error-callback': () => { token = ''; setFeedback('Security check could not load. Please refresh and try again.', true); } });
        };
        script.onerror = () => setFeedback('Security check could not load. Please refresh and try again.', true);
        document.head.append(script);
      }
    } catch (error) { setFeedback(error.message, true); }
    setSubmitState();
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (posting || processingPhotos || !configuration || !form.reportValidity()) return;
    const values = new FormData(form);
    if (values.get('website')) return;
    if (configuration.turnstileRequired && !token) { setFeedback('Please complete the security check.', true); return; }
    const payload = { name: values.get('name').trim(), rating: Number(values.get('rating')), text: values.get('text').trim(), images: [...photos], turnstileToken: token, website: '' };
    if (payload.name.length < 2 || payload.text.length < 10) { setFeedback('Enter your name and a review of at least 10 characters.', true); return; }
    posting = true; fileInput.disabled = true; setFeedback(''); setSubmitState(); renderPreviews();
    try {
      const data = await api('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!data.success || !data.review) throw new Error('Your review could not be saved. Please try again.');
      reviews.unshift(data.review); render(); form.reset(); photos = [];
      setFeedback('Thank you! Your review is now published for everyone to see.');
    } catch (error) { setFeedback(`${error.message} Your review has not been published.`, true); }
    finally { posting = false; fileInput.disabled = false; resetSecurity(); renderPreviews(); setSubmitState(); }
  });
  const adminDialog = $('#review-admin-dialog');
  manager.addEventListener('click', () => { $('#review-admin-error').textContent = ''; adminDialog.showModal(); });
  document.querySelector('.page-hero__title')?.addEventListener('click', event => { if (event.detail === 3 && !adminKey) manager.click(); });
  $('#review-admin-form').addEventListener('submit', async event => {
    event.preventDefault();
    const input = $('#review-admin-key');
    const button = event.submitter;
    button.disabled = true;
    try {
      const key = input.value;
      await api('/api/reviews/admin', { headers: { Authorization: `Bearer ${key}` } });
      adminKey = key; input.value = ''; adminDialog.close(); render();
    } catch (error) { $('#review-admin-error').textContent = error.message; }
    finally { button.disabled = false; }
  });
  signout.addEventListener('click', () => { adminKey = ''; pendingDelete = null; render(); });
  $('#review-confirm-delete').addEventListener('click', async event => {
    if (!pendingDelete || !adminKey) return;
    const button = event.currentTarget; button.disabled = true;
    try {
      await api(`/api/reviews?id=${encodeURIComponent(pendingDelete.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminKey}` } });
      reviews = reviews.filter(review => review.id !== pendingDelete.id);
      $('#review-delete-dialog').close(); pendingDelete = null; render();
      $('#reviews-load-status').textContent = 'Review deleted from the website.';
    } catch (error) {
      $('#review-delete-error').textContent = error.message;
      if (error.status === 401) { adminKey = ''; render(); }
    } finally { button.disabled = false; }
  });
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  for (const dialog of document.querySelectorAll('.review-dialog')) dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  if (location.hash === '#manage') manager.click();
  loadReviews(); loadConfiguration();
})();
