# terminal.kdanni.org

A modular, service-oriented platform for collecting, normalizing, and serving financial time series data. The project is organi
zed into distinct layers so that ingestion, storage, and presentation can evolve independently while sharing a common schema and
configuration vocabulary.

## Repository Layout

```
.
├── ARCHITECTURE.md      # High-level system description
├── CONTEXT.md           # Project background and goals
├── SCHEMA.md            # Database entities and conventions
├── collector/           # Node.js (TypeScript) ingestion service skeleton
├── config/              # Shared configuration placeholders
├── docker-compose.yml   # Container orchestration scaffold
└── package.json         # Workspace metadata and shared scripts
```

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run the collector service in development mode**

   ```bash
   npm run start:collector
   ```

   The bootstrap sequence currently logs a single startup line until additional functionality is implemented.

3. **Docker Compose (optional)**

   A minimal `docker-compose.yml` is provided to outline how services will integrate. It is not yet runnable because the supporti
ng implementations are still under construction.

## Next Steps

- Implement provider interfaces for pulling OHLCV data.
- Add persistence adapters for PostgreSQL + TimescaleDB.
- Expose API endpoints for downstream clients.
- Extend Docker Compose definitions with full environment variables and volumes.

Refer to the accompanying documentation files for detailed architecture, schema, and contextual guidance.
