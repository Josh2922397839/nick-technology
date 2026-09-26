import { handleReviews } from '../../../lib/reviews.js';
export const onRequest = ({ request, env }) => handleReviews(request, env);
