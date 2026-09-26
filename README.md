# Nick Technology

Production website: https://nicktechnologygroup.com/

The redesign from `Documents/Best/nick-tech` is integrated here. Edit page templates in `website/pages`, reusable sections in `website/partials`, and styles/scripts/images in `site/assets`. `npm run build` assembles the pages into `site`; Cloudflare serves only that directory. Node is the only build runtime required.

## Development and deployment

Run `npm ci`, then `npm run build` and `npm test`. Use `npm run preview` for a local Worker. Local development uses local D1, never the production database. To initialise it: `npx wrangler d1 execute nick-technology-db --local --file schema.sql`.

`npm run deploy` rebuilds and deploys the existing `nick-technology` Worker, retaining its secrets and database binding. The database ID and both production domains are unchanged.

For Cloudflare Git integration, connect `Josh2922397839/nick-technology`, production branch `main`, project root `/`, build command `npm run build`, deploy command `npx wrangler deploy --keep-vars`. Future pushes to `main` then publish automatically.

## Mobile behavior

Phones, tablets, reduced-motion visits and data-saving connections use the lightweight layout without the four desktop motion libraries or the loading animation. Videos load when tapped on these devices; desktop videos load only when visible. The homepage uses smaller responsive feed images. Mobile navigation supports keyboard focus and Escape, review photo preparation runs sequentially to limit memory use, and native page scrolling keeps forms and anchors accessible.

## Reviews and the admin key

Open https://nicktechnologygroup.com/reviews.html to read or publish a review with up to three photos (JPEG, PNG, WebP; 5 MB per input photo). Photos are resized in the browser and saved in the existing D1 reviews table. Old single-photo reviews remain compatible. Submission failures keep the form and never claim a review was published.

Open https://nicktechnologygroup.com/reviews and quickly click or tap the **“Don't just take our word for it.”** heading three times. Keyboard users can focus the heading and press Enter three times. Enter the existing `ADMIN_SECRET` key in the prompt. After the server validates it, delete buttons appear on customer reviews. **Lock management** hides them; reloading also locks management. The key is held in memory only and is never included in public site files or GitHub.

The existing local key is in the ignored `.dev.vars` file. Cloudflare keeps the production key under **Workers & Pages → nick-technology → Settings → Variables and Secrets → ADMIN_SECRET**. Cloudflare does not display the stored secret value; keep your local copy. Do not replace or commit it.

Turnstile activates automatically if `TURNSTILE_SECRET_KEY` is set on the Worker, using the existing site key or optional `TURNSTILE_SITE_KEY`. The client and server agree on whether a check is required.
