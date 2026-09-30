import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shopStatus, clock12, jamaicaTime, quoteProblems, quoteMessage, whatsappLink,
} from '../website/js/core.mjs';

test('the shop is open during weekday hours', () => {
  assert.equal(shopStatus({ day: 2, h: 10, m: 0 }).state, 'open');
  assert.equal(shopStatus({ day: 6, h: 8, m: 30 }).state, 'open', 'opens at exactly 8:30 on Saturday');
});

test('the last 45 minutes show "closing soon"', () => {
  const status = shopStatus({ day: 3, h: 18, m: 0 });
  assert.equal(status.state, 'soon');
  assert.equal(status.sub, 'Closes in 30 min');
});

test('closed times say when the shop opens next', () => {
  assert.deepEqual(
    [shopStatus({ day: 1, h: 7, m: 59 }), shopStatus({ day: 4, h: 18, m: 30 }), shopStatus({ day: 6, h: 19, m: 0 }), shopStatus({ day: 0, h: 12, m: 0 })].map((s) => [s.state, s.sub]),
    [['closed', 'Opens today 8:30 AM'], ['closed', 'Opens tomorrow 8:30 AM'], ['closed', 'Opens Monday 8:30 AM'], ['closed', 'Opens tomorrow 8:30 AM']],
  );
});

test('clock times use a 12-hour format', () => {
  assert.deepEqual([0, 8 * 60 + 30, 12 * 60, 18 * 60 + 30].map(clock12), ['12:00 AM', '8:30 AM', '12:00 PM', '6:30 PM']);
});

test('Jamaica time is UTC-5 all year', () => {
  assert.deepEqual(jamaicaTime(new Date('2026-07-06T15:04:05Z')), { day: 1, h: 10, m: 4, s: 5 });
  assert.deepEqual(jamaicaTime(new Date('2026-01-05T04:30:00Z')), { day: 0, h: 23, m: 30, s: 0 }, 'still Sunday evening in Portmore');
});

test('quote form needs a name and a reachable phone number', () => {
  assert.deepEqual(quoteProblems({ name: '', phone: '123' }), ['name', 'phone']);
  assert.deepEqual(quoteProblems({ name: 'Marsha', phone: '(876) 555-0199' }), []);
});

test('quote messages are ready to send on WhatsApp', () => {
  const text = quoteMessage({ service: 'Phone repair', name: ' Marsha ', phone: '876-555-0199', message: ' Screen cracked ' });
  assert.equal(text, "Hi Nicholas, I'd like a quote.\n\nService: Phone repair\nName: Marsha\nPhone: 876-555-0199\nDetails: Screen cracked");
  assert.equal(quoteMessage({ service: '', name: 'A', phone: '1234567', message: '' }).includes('Details'), false);
  assert.ok(whatsappLink(text).startsWith('https://wa.me/18764655975?text=Hi%20Nicholas'));
});
