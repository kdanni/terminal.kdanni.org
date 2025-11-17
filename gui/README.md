# terminal.kdanni.org GUI (POC)

This proof-of-concept frontend consumes the existing backend asset catalog API and renders a searchable data table.

## Getting started

```bash
cd gui
npm install
npm run dev
```

By default the Vite development server proxies API requests to `http://localhost:3000`. Override this by creating a `.env` file with `VITE_API_BASE_URL` or `VITE_PROXY_TARGET`.

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

## Merge status

- No conflict markers or unresolved merges are present in the GUI codebase as of this review.
