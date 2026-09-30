// Pure helpers shared by the site script and the tests. No DOM access here.

export const WHATSAPP = '18764655975';
export const EMAIL = 'COMTEC_ZION@YAHOO.COM';
export const OPEN = 8 * 60 + 30; // 8:30 AM, Mon–Sat
export const CLOSE = 18 * 60 + 30; // 6:30 PM

const DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
let formatter;

/** Current weekday/hour/minute/second in Jamaica (UTC-5, no daylight saving). */
export function jamaicaTime(date = new Date()) {
  formatter ||= new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Jamaica', hour12: false, weekday: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = {};
  for (const part of formatter.formatToParts(date)) parts[part.type] = part.value;
  return { day: DAYS[parts.weekday], h: Number(parts.hour) % 24, m: Number(parts.minute), s: Number(parts.second) };
}

export const pad = (n) => String(n).padStart(2, '0');

export function clock12(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  return `${h % 12 || 12}:${pad(minutes % 60)} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Shop state for the live badges: open, closing soon or closed, plus call-to-action copy. */
export function shopStatus({ day, h, m }) {
  const minutes = h * 60 + m;
  const workday = day >= 1 && day <= 6;
  if (workday && minutes >= OPEN && minutes < CLOSE) {
    const left = CLOSE - minutes;
    if (left <= 45) return { state: 'soon', text: 'Closing soon', sub: `Closes in ${left} min`, cta: `Call before ${clock12(CLOSE)}` };
    return { state: 'open', text: 'Open now', sub: `Open until ${clock12(CLOSE)}`, cta: 'Call Nicholas directly' };
  }
  const when = workday && minutes < OPEN ? 'today' : day === 6 ? 'Monday' : 'tomorrow';
  return { state: 'closed', text: 'Closed now', sub: `Opens ${when} ${clock12(OPEN)}`, cta: 'Call or WhatsApp any time' };
}

/** Fields that stop the quote form from being sent, in display order. */
export function quoteProblems({ name = '', phone = '' }) {
  const problems = [];
  if (!name.trim()) problems.push('name');
  if (phone.replace(/\D/g, '').length < 7) problems.push('phone');
  return problems;
}

export function quoteMessage({ service, name, phone, message }) {
  const lines = ["Hi Nicholas, I'd like a quote.", '', `Service: ${service || 'Not sure yet'}`, `Name: ${name.trim()}`, `Phone: ${phone.trim()}`];
  if (message && message.trim()) lines.push(`Details: ${message.trim()}`);
  return lines.join('\n');
}

export const whatsappLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
export const emailLink = (subject, body) => `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
