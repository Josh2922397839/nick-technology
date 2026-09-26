const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
const MAX_PHOTOS = 3;
const MAX_PHOTO_LENGTH = 250000;
const MAX_BODY_LENGTH = MAX_PHOTOS * MAX_PHOTO_LENGTH + 10000;
const COLORS = ['#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6', '#14B8A6'];

export function reviewImages(value) {
  if (!value) return [];
  if (value.startsWith('[')) {
    try { const images = JSON.parse(value); return Array.isArray(images) ? images.filter(x => typeof x === 'string') : []; } catch { return []; }
  }
  return [value];
}

function validPhoto(value) {
  if (typeof value !== 'string' || value.length > MAX_PHOTO_LENGTH) return false;
  const match = value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return false;
  try {
    const bytes = atob(match[2]);
    if (match[1] === 'jpeg') return bytes.startsWith('\xff\xd8\xff');
    if (match[1] === 'png') return bytes.startsWith('\x89PNG\r\n\x1a\n');
    return bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP';
  } catch { return false; }
}

async function isAdmin(request, env) {
  if (!env.ADMIN_SECRET) return false;
  const supplied = request.headers.get('Authorization') || '';
  const encoder = new TextEncoder();
  const [actual, expected] = await Promise.all([supplied, `Bearer ${env.ADMIN_SECRET}`].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  const a = new Uint8Array(actual), b = new Uint8Array(expected);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

export async function handleReviews(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/reviews/config' && request.method === 'GET') {
    return json({ turnstileRequired: Boolean(env.TURNSTILE_SECRET_KEY), turnstileSiteKey: env.TURNSTILE_SITE_KEY || '0x4AAAAAADVL9k7MJtlmBqk0' });
  }
  if (url.pathname === '/api/reviews/admin' && request.method === 'GET') {
    if (!env.ADMIN_SECRET) return json({ error: 'Review management is not configured.' }, 503);
    return await isAdmin(request, env) ? json({ success: true }) : json({ error: 'Incorrect admin key.' }, 401);
  }
  if (url.pathname !== '/api/reviews') return json({ error: 'Not found.' }, 404);
  if (!['GET', 'POST', 'DELETE'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, POST, DELETE' });
  const db = env.nick_technology_db;
  if (!db) return json({ error: 'Reviews are temporarily unavailable. Please try again later.' }, 503);
  try {
    if (request.method === 'GET') {
      const { results } = await db.prepare('SELECT * FROM reviews ORDER BY date DESC, id DESC LIMIT 100').all();
      return json(results.map(review => ({ ...review, images: reviewImages(review.image) })));
    }
    if (request.method === 'DELETE') {
      if (!env.ADMIN_SECRET) return json({ error: 'Review management is not configured.' }, 503);
      if (!await isAdmin(request, env)) return json({ error: 'Incorrect admin key.' }, 401);
      const id = url.searchParams.get('id');
      if (!id || id.length > 100) return json({ error: 'A valid review ID is required.' }, 400);
      const result = await db.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();
      if (!result.meta.changes) return json({ error: 'This review no longer exists.' }, 404);
      return json({ success: true, id });
    }
    if (!request.headers.get('Content-Type')?.includes('application/json')) return json({ error: 'Send reviews as JSON.' }, 415);
    if (Number(request.headers.get('Content-Length')) > MAX_BODY_LENGTH) return json({ error: 'Photos are too large.' }, 413);
    const raw = await request.text();
    if (raw.length > MAX_BODY_LENGTH) return json({ error: 'Photos are too large.' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid review data.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid review data.' }, 400);
    const { name, rating, text, turnstileToken } = body;
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) return json({ error: 'Name must be between 2 and 60 characters.' }, 400);
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) return json({ error: 'Choose a rating between 1 and 5 stars.' }, 400);
    if (typeof text !== 'string' || text.trim().length < 10 || text.trim().length > 1000) return json({ error: 'Review must be between 10 and 1,000 characters.' }, 400);
    if (body.website) return json({ error: 'Unable to submit this review.' }, 400);
    const images = body.images ?? (body.image ? [body.image] : []);
    if (!Array.isArray(images) || images.length > MAX_PHOTOS || !images.every(validPhoto)) return json({ error: 'Attach up to 3 JPEG, PNG or WebP photos.' }, 400);
    if (env.TURNSTILE_SECRET_KEY) {
      if (typeof turnstileToken !== 'string' || !turnstileToken) return json({ error: 'Complete the security check.' }, 400);
      const form = new FormData();
      form.append('secret', env.TURNSTILE_SECRET_KEY);
      form.append('response', turnstileToken);
      const ip = request.headers.get('CF-Connecting-IP');
      if (ip) form.append('remoteip', ip);
      const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
      if (!(await verification.json()).success) return json({ error: 'Security check failed. Please try again.' }, 400);
    }
    const cleanName = name.trim();
    const review = { id: 'u' + Date.now() + crypto.randomUUID().slice(0, 8), name: cleanName, rating: ratingNum, text: text.trim(), initials: cleanName.split(/\s+/).map(word => word[0]).join('').toUpperCase().slice(0, 2), color: COLORS[cleanName.codePointAt(0) % COLORS.length], image: images.length > 1 ? JSON.stringify(images) : images[0] || null, images, date: new Date().toISOString().slice(0, 10) };
    await db.prepare('INSERT INTO reviews (id, name, rating, text, color, initials, image, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(review.id, review.name, review.rating, review.text, review.color, review.initials, review.image, review.date).run();
    return json({ success: true, review }, 201);
  } catch (error) {
    console.error('Reviews API failed:', error);
    return json({ error: 'Reviews are temporarily unavailable. Your review has not been saved; please try again.' }, 503);
  }
}
