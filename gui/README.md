# terminal.kdanni.org GUI (POC)

This proof-of-concept frontend consumes the existing backend asset catalog API and renders a searchable data table.

## Getting started

```bash
cd gui
npm install
npm run dev
```

By default the Vite development server proxies API requests to `http://localhost:3000`. Override this by creating a `.env` file with `VITE_API_BASE_URL` or `VITE_PROXY_TARGET`.

Security-sensitive environment options:

- `VITE_SENTRY_DSN` – enable Sentry error capture in the browser.
- `VITE_LOGTAIL_SOURCE_TOKEN` – forward console errors to Logtail for field debugging.
- `VITE_UPTIME_HEARTBEAT_URL` – optional endpoint that receives client-side heartbeats every five minutes.
- `VITE_RELEASE` – release tag forwarded to observability tooling.

### Local mock API (MSW)

Mock Service Worker (MSW) fixtures unblock frontend work when the backend is unavailable. To enable them:

1. Generate the service worker (one-time):

   ```bash
   npm run msw:init
   ```

2. Start Vite with mocks enabled:

   ```bash
   VITE_USE_MSW=true npm run dev
   ```

The mock layer provides in-memory responses for `/api/assets`, `/api/watch-list`, `/api/watch-list/toggle`, `/api/me`, and `/api/ohlcv` based on the contracts in `docs/api-contracts.md`.

## Available scripts

- `npm run dev` – start the Vite development server
- `npm run build` – create a production build in `dist`
- `npm run preview` – preview the production build locally
- `npm run test` – run the Vitest unit test suite

## Auth0 configuration

Configure the Auth0 SPA with the same origins you use to host the GUI:

- **Allowed Callback URLs**: `https://terminal.kdanni.org`, `http://localhost:5173`, `http://localhost:4173`
- **Allowed Logout URLs**: `https://terminal.kdanni.org`, `http://localhost:5173`, `http://localhost:4173`
- **Allowed Web Origins**: `https://terminal.kdanni.org`, `http://localhost:5173`, `http://localhost:4173`

Auth0’s “Application Login URI” should point to the GUI’s dedicated login route so Universal Login redirects return users to
the app. Use `/login` on each host (for example, `https://terminal.kdanni.org/login` or `http://localhost:5173/login`). The
route forwards users to Auth0’s `/authorize` endpoint and accepts an optional, same-origin `returnTo` query string to resume
navigation after authentication.

The Auth0 SPA SDK stores tokens in memory by default to avoid leaking refresh tokens into `localStorage`. Refresh tokens are
disabled on non-HTTPS origins to prevent insecure cookie usage.

## Security headers and CSP

The `public/_headers` file applies security headers (HSTS, CSP with `require-sri-for`, frame/permission protections) for
static hosting providers that honor Netlify-style header manifests. Ensure deployments include this file so third-party
resources require SRI and all cookies stay scoped to HTTPS origins.

## Observability

- Errors automatically flow to Sentry when a DSN is supplied and to Logtail when a source token is present.
- A lightweight uptime beacon can be enabled via `VITE_UPTIME_HEARTBEAT_URL`; the client will `sendBeacon` every five minutes
  with a timestamp and user agent string.
- Operational runbooks live in `docs/incident-playbook.md`.

## Runbooks

### Environment configuration

Define the following variables in `.env.production` (or your hosting provider’s environment editor) before building:

- `VITE_API_BASE_URL` – production API origin for proxying `/api` requests.
- `VITE_AUTH0_DOMAIN` / `VITE_AUTH0_CLIENT_ID` – Auth0 tenant details for the SPA.
- `VITE_SENTRY_DSN`, `VITE_RELEASE` – observability identifiers for Sentry/Logtail.
- `VITE_UPTIME_HEARTBEAT_URL` – optional heartbeat endpoint for client-side pings.
- `VITE_PREVIEW_PORT` – overrides `npm run preview`’s port when simulating production locally.

### Deploying the GUI

1. Build the production assets with source maps enabled: `npm run build` (outputs to `dist/`).
2. Verify `dist/assets` contains hashed bundles **and** matching `.map` files before shipping.
3. Ensure `public/_headers` ships with the deployment so cache and security headers apply; immutable assets should return
   `Cache-Control: public, max-age=31536000, immutable` and `/` should be `Cache-Control: no-cache`.
4. Upload `dist/` to the static host (for Netlify-style hosts, include `_headers` in the upload root).
5. Smoke-test with `npm run preview` (or your CDN preview URL) to confirm API connectivity and Auth0 login flows.

### Support contacts

- **Primary on-call**: kdanni (Slack: `@kdanni`, email: `ops@kdanni.org`).
- **Escalation**: SRE rotation via `#ops-oncall` Slack channel.
- **Incident docs**: `docs/incident-playbook.md` for triage and rollback steps.

## Merge status

- No conflict markers or unresolved merges are present in the GUI codebase as of this review.
