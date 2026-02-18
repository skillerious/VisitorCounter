# Privé Cartel — Visit Counter

A self-hosted profile visit counter matching your Torn City signature aesthetic.

---

## Architecture

```
Torn Profile Signature (iframe)
        │
        ▼
GitHub Pages  →  index.html  (display widget)
        │
        ▼  fetch()
Cloudflare Workers  →  worker.js  (counter storage via KV)
```

**Why Cloudflare Workers?**
GitHub Pages is static — it can't store state. Cloudflare Workers free tier gives you
100,000 requests/day with global edge distribution and zero cost.

---

## Step 1 — Deploy the Worker

1. Sign up at [cloudflare.com](https://cloudflare.com) (free)
2. Go to **Workers & Pages → Create → Create Worker**
3. Name it something like `pc-visit-counter`
4. Click **Edit code**, paste the contents of `worker.js`, click **Deploy**
5. Go to **Settings → Variables → KV Namespace Bindings**
   - Click **Add binding**
   - Variable name: `COUNTER_KV`
   - KV Namespace: click **Create a new namespace** → name it `visit_counter` → confirm
6. Click **Save and deploy**
7. Copy your Worker URL — it looks like:
   `https://pc-visit-counter.YOUR-USERNAME.workers.dev`

Test it works by visiting: `https://pc-visit-counter.YOUR-USERNAME.workers.dev/hit`
You should see: `{"total":1,"today":1}`

---

## Step 2 — Configure the Counter Page

Open `index.html` and find this line near the bottom:

```js
const WORKER_URL = 'https://YOUR-WORKER.YOUR-USERNAME.workers.dev';
```

Replace it with your actual Worker URL from Step 1.

---

## Step 3 — Host on GitHub Pages

1. Create a new GitHub repo (e.g. `torn-counter`)
2. Push `index.html` to the `main` branch (the `worker.js` stays in Cloudflare — don't push it)
3. Go to repo **Settings → Pages**
4. Source: **Deploy from a branch** → `main` / `/ (root)` → Save
5. Your counter will be live at:
   `https://YOUR-USERNAME.github.io/torn-counter/`

---

## Step 4 — Embed in Your Torn Signature

Add this inside your signature HTML where you want the counter to appear:

```html
<iframe
  src="https://YOUR-USERNAME.github.io/torn-counter/"
  style="width:320px; height:130px; border:none; overflow:hidden; background:transparent;"
  scrolling="no"
  loading="lazy"
  title="Profile Views"
></iframe>
```

Adjust `height` if needed. The widget is 320 × ~128px.

---

## Customisation

| What                | Where in `index.html`         | Change to                          |
|---------------------|-------------------------------|------------------------------------|
| Starting count      | Worker KV → `total` key       | Set via `wrangler kv:key put`      |
| Counter width       | `.shell { width: ... }`       | Any px value                       |
| Digit colours       | `--cyan` CSS variable         | Any hex colour                     |
| Gold accents        | `--gold` CSS variable         | Any hex colour                     |
| Session dedup key   | `SESSION_KEY` const           | Any unique string                  |

---

## Seeding an Initial Count

If you want to start at a specific number (e.g. 1000) rather than 0:

1. Install Wrangler: `npm install -g wrangler`
2. Authenticate: `wrangler login`
3. Run:
```
wrangler kv:key put --namespace-id=YOUR_NAMESPACE_ID "total" "1000"
```
Find your namespace ID in Cloudflare → Workers & Pages → KV → your namespace.
