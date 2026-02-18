/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         PRIVÉ CARTEL — Visit Counter Worker                  ║
 * ║  Deploy to Cloudflare Workers (free tier, 100k req/day)      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  SETUP:                                                      ║
 * ║  1. Create a Cloudflare account at cloudflare.com            ║
 * ║  2. Go to Workers & Pages → Create Application → Worker     ║
 * ║  3. Paste this entire file into the editor                   ║
 * ║  4. Go to Settings → Variables → KV Namespace Bindings      ║
 * ║     Add binding:  Variable name = COUNTER_KV                 ║
 * ║     (Create a new KV namespace called "visit_counter")       ║
 * ║  5. Deploy, copy your Worker URL, paste into index.html      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 *  Endpoints:
 *    GET /hit   → increment total + today, return JSON
 *    GET /peek  → read without incrementing, return JSON
 *
 *  All responses include CORS headers so your GitHub Pages
 *  counter page can fetch freely.
 */

// ── CORS headers ────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
};

// ── Date key for today's count (UTC) ────────────────────────────
function todayKey() {
  return 'day:' + new Date().toISOString().slice(0, 10); // "day:2025-10-04"
}

// ── Main handler ─────────────────────────────────────────────────
export default {
  async fetch(request, env) {

    // Pre-flight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url      = new URL(request.url);
    const path     = url.pathname;
    const KV       = env.COUNTER_KV;        // KV namespace binding

    // Validate KV is wired up
    if (!KV) {
      return json({ error: 'KV namespace not configured' }, 500);
    }

    try {
      const TOTAL_KEY = 'total';
      const DAY_KEY   = todayKey();

      if (path === '/hit') {
        // ── Atomic-safe increment using KV ──────────────────────
        // Cloudflare KV isn't truly atomic, but for a profile counter
        // the tiny race window is completely acceptable.
        const [rawTotal, rawDay] = await Promise.all([
          KV.get(TOTAL_KEY),
          KV.get(DAY_KEY),
        ]);

        const total = (parseInt(rawTotal ?? '0', 10) || 0) + 1;
        const today = (parseInt(rawDay   ?? '0', 10) || 0) + 1;

        // Write back; today's key expires at midnight + 2h buffer
        const secondsUntilMidnight = getSecondsUntilMidnight();
        await Promise.all([
          KV.put(TOTAL_KEY, String(total)),
          KV.put(DAY_KEY,   String(today), { expirationTtl: secondsUntilMidnight + 7200 }),
        ]);

        return json({ total, today });
      }

      if (path === '/peek') {
        // ── Read-only ────────────────────────────────────────────
        const [rawTotal, rawDay] = await Promise.all([
          KV.get(TOTAL_KEY),
          KV.get(DAY_KEY),
        ]);

        const total = parseInt(rawTotal ?? '0', 10) || 0;
        const today = parseInt(rawDay   ?? '0', 10) || 0;

        return json({ total, today });
      }

      // ── Unknown path ─────────────────────────────────────────
      return json({ error: 'Not found. Use /hit or /peek' }, 404);

    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: 'Internal error', detail: err.message }, 500);
    }
  }
};

// ── Helpers ──────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function getSecondsUntilMidnight() {
  const now   = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return Math.floor((midnight - now) / 1000);
}
