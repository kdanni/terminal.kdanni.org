# terminal.kdanni.org GUI (POC)

This proof-of-concept frontend consumes the existing backend asset catalog API and renders a searchable data table.

## Getting started

```bash
cd gui
npm install
npm run dev
```

By default the Vite development server proxies API requests to `http://localhost:3000`. Override this by creating a `.env` file with `VITE_API_BASE_URL` or `VITE_PROXY_TARGET`.

## Available scripts

- `npm run dev` – start the Vite development server
- `npm run build` – create a production build in `dist`
- `npm run preview` – preview the production build locally
- `npm run test` – run the Vitest unit test suite
