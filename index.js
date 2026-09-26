import { handleReviews } from './lib/reviews.js';
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/')) return handleReviews(request, env);
    return env.ASSETS.fetch(request);
  }
};
