# Toonstream Home Proxy (Cloudflare Worker)

This Worker provides an API that fetches HTML from:

- `https://toonstream.dad/home/`

## Endpoints

- `GET /api/home`
  - Returns raw HTML from upstream
- `GET /api/home-json`
  - Returns JSON with upstream status + HTML
- `GET /`
  - Health + endpoint info

## Deploy Steps

1. Install Wrangler globally:
   - `npm install -g wrangler`
2. Login to Cloudflare:
   - `wrangler login`
3. Deploy:
   - `wrangler deploy`

After deploy, call:

- `https://<your-worker>.workers.dev/api/home`
