// Custom Cloudflare Worker with Static Assets
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── Intercept API Endpoints ──
    if (url.pathname.startsWith('/api/')) {
      // GET /api/reviews
      if (url.pathname === '/api/reviews' && request.method === 'GET') {
        return handleGetReviews(request, env);
      }
      // POST /api/reviews
      if (url.pathname === '/api/reviews' && request.method === 'POST') {
        return handlePostReviews(request, env);
      }
      // DELETE /api/reviews
      if (url.pathname === '/api/reviews' && request.method === 'DELETE') {
        return handleDeleteReview(request, env);
      }
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // ── Serve Static Assets ──
    // Fallback to the built-in assets service binding env.ASSETS
    return env.ASSETS.fetch(request);
  }
};

async function handleGetReviews(request, env) {
  try {
    const db = env.nick_technology_db;
    if (!db) {
      return new Response(JSON.stringify({ error: "Database binding 'nick_technology_db' not found" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Query all reviews from D1
    const { results } = await db.prepare("SELECT * FROM reviews ORDER BY date DESC, id DESC LIMIT 100").all();

    return new Response(JSON.stringify(results), {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=5"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

async function handlePostReviews(request, env) {
  try {
    const db = env.nick_technology_db;
    if (!db) {
      return new Response(JSON.stringify({ error: "Database binding 'nick_technology_db' not found" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Parse JSON payload
    const body = await request.json();
    const { name, rating, text, image, turnstileToken } = body;

    // Validation
    if (!name || name.trim().length < 2 || name.trim().length > 60) {
      return new Response(JSON.stringify({ error: "Name must be between 2 and 60 characters." }), { status: 400 });
    }
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return new Response(JSON.stringify({ error: "Rating must be between 1 and 5 stars." }), { status: 400 });
    }
    if (!text || text.trim().length < 10 || text.trim().length > 1000) {
      return new Response(JSON.stringify({ error: "Review text must be between 10 and 1000 characters." }), { status: 400 });
    }

    // Server-side Turnstile verification
    const secretKey = env.TURNSTILE_SECRET_KEY;
    if (secretKey) {
      if (!turnstileToken) {
        return new Response(JSON.stringify({ error: "Missing Turnstile security token" }), { status: 400 });
      }

      const formData = new FormData();
      formData.append("secret", secretKey);
      formData.append("response", turnstileToken);
      
      const ip = request.headers.get("CF-Connecting-IP");
      if (ip) formData.append("remoteip", ip);

      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: formData
      });
      const verifyJson = await verifyRes.json();

      if (!verifyJson.success) {
        return new Response(JSON.stringify({ error: "Security check failed. Please try again." }), { status: 400 });
      }
    }

    // Generate initials and avatar color
    const id = "u" + Date.now() + Math.random().toString(36).substring(2, 6);
    const date = new Date().toISOString().split("T")[0];
    const initials = name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    
    const AVATAR_COLORS = ['#10B981','#F59E0B','#6366F1','#EC4899','#8B5CF6','#14B8A6','#F43F5E','#2563EB','#EF4444','#06B6D4'];
    const color = AVATAR_COLORS[Math.abs(name.trim().charCodeAt(0) + name.trim().charCodeAt(name.trim().length - 1)) % AVATAR_COLORS.length];

    // Save in D1 Database
    await db.prepare(
      "INSERT INTO reviews (id, name, rating, text, color, initials, image, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(id, name.trim(), ratingNum, text.trim(), color, initials, image || null, date)
    .run();

    return new Response(
      JSON.stringify({ 
        success: true, 
        review: { id, name: name.trim(), rating: ratingNum, text: text.trim(), color, initials, image: image || null, date } 
      }), 
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

async function handleDeleteReview(request, env) {
  try {
    const db = env.nick_technology_db;
    if (!db) {
      return new Response(JSON.stringify({ error: "Database binding 'nick_technology_db' not found" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const adminSecret = env.ADMIN_SECRET;
    if (!adminSecret) {
      return new Response(JSON.stringify({ error: "Admin secret is not configured on the server." }), { status: 500 });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized. Incorrect admin passcode." }), { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return new Response(JSON.stringify({ error: "Review ID is required." }), { status: 400 });
    }

    await db.prepare("DELETE FROM reviews WHERE id = ?").bind(id).run();

    return new Response(JSON.stringify({ success: true, id }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
