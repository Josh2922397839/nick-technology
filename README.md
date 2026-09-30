# Nick Technology

Production website: https://nicktechnologygroup.com/

## Where things live

| Edit this | For |
|---|---|
| `website/pages/*.html` | Page content (front-matter comment at the top sets title and description) |
| `website/partials/*.html` | Shared blocks: header, footer, call dock, map, call strips, reviews, sequence |
| `website/css/critical.css` | First-screen styles, **inlined** into every page (header, heroes, buttons, call dock, motion) |
| `website/css/site.css` | Everything below the first screen, loaded without blocking and cached for a year |
| `website/js/app.mjs` | Site behaviour; `website/js/core.mjs` holds the tested logic (shop hours, quote messages) |
| `website/js/reviews.js` | Reviews page (API, photo uploads, protected management) |
| `site/assets/img`, `video`, `fonts` | Static media, served as-is |

`npm run build` assembles everything into `site/`, which is the only directory Cloudflare serves. CSS and JS are bundled and minified with esbuild and written to `site/assets/build/` with content-hashed names (for example `app.cda4b3a023.js`), so browsers cache them for a year and still get every update instantly. The build also writes `site/_headers` (cache and security headers), `robots.txt` and `sitemap.xml`. Node is the only build runtime required.

`npm run images` re-creates the small, pre-cropped image variants (`*-feed.webp`, `*-md.webp`) from the full-size photos.

## Built for calls on slow phones

- **Call first:** every page leads with a large "Call (876) 465-5975" button. On phones a sticky Call/WhatsApp bar appears as soon as that button scrolls away, the header always has a labelled Call button, and call strips sit mid-page.
- **Live status:** badges show "Open now", "Closing soon" or "Closed now" from Portmore time (Mon–Sat 8:30–6:30).
- **Fast first screen:** no render-blocking stylesheets or third-party requests. Two small self-hosted fonts (about 40 KB total, trimmed to one weight) replace four Google font families. The body text uses the phone's own font.
- **Light script:** about 15 KB of JavaScript in total, with no animation libraries, no preloader and no scroll listeners.
- **Clean motion:** animations are CSS transitions on opacity and movement only, started when content scrolls into view. Loops (ticker, video wall, network diagram) pause offscreen. Everything respects "reduce motion".
- **Nothing heavy until asked:** offscreen sections skip rendering (`content-visibility`). Videos never download until tapped on phones or on data-saver connections. Google Maps loads only when requested.

## Measuring calls

Every call, WhatsApp and email link pushes an event to `window.dataLayer` (`call_click`, `whatsapp_click`, `email_click`, with a `cta` value such as `call_hero`, `call_dock` or `call_band`). The quote forms push `quote_whatsapp` or `quote_email`. If you add Google Tag Manager or GA4, these arrive automatically, so you can see which buttons produce calls.

## Development and deployment

Run `npm ci`, then `npm run build` and `npm test`. Tests cover the review API, the hours logic, a smoke test that runs the built site script, and checks on the built pages (every page has a call link and the call dock, every referenced file exists, no render-blocking assets). Use `npm run preview` for a local Worker. Local development uses local D1, never the production database. To initialise it: `npx wrangler d1 execute nick-technology-db --local --file schema.sql`.

`npm run deploy` rebuilds and deploys the existing `nick-technology` Worker, retaining its secrets and database binding. The database ID and both production domains are unchanged.

For Cloudflare Git integration, connect `Josh2922397839/nick-technology`, production branch `main`, project root `/`, build command `npm run build`, deploy command `npx wrangler deploy --keep-vars`. Future pushes to `main` then publish automatically.

## Reviews and the admin key

Open https://nicktechnologygroup.com/reviews.html to read or publish a review with up to three photos (JPEG, PNG, WebP; 5 MB per input photo). Photos are resized in the browser and saved in the existing D1 reviews table. Old single-photo reviews remain compatible. Submission failures keep the form and never claim a review was published.

Open https://nicktechnologygroup.com/reviews and quickly click or tap the **“Don't just take our word for it.”** heading three times. Keyboard users can focus the heading and press Enter three times. Enter the existing `ADMIN_SECRET` key in the prompt. After the server validates it, delete buttons appear on customer reviews. **Lock management** hides them; reloading also locks management. The key is held in memory only and is never included in public site files or GitHub.

The existing local key is in the ignored `.dev.vars` file. Cloudflare keeps the production key under **Workers & Pages → nick-technology → Settings → Variables and Secrets → ADMIN_SECRET**. Cloudflare does not display the stored secret value; keep your local copy. Do not replace or commit it.

Turnstile activates automatically if `TURNSTILE_SECRET_KEY` is set on the Worker, using the existing site key or optional `TURNSTILE_SITE_KEY`. The client and server agree on whether a check is required.
