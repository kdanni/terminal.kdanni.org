# Configuration Scaffold

Configuration files will be added incrementally as services are implemented. Expected structure:

- `providers/` — YAML definitions for external data providers and their rate limits.
- `scheduler/` — Cron or task queue definitions for ingestion workflows.
- `database/` — Connection settings, migrations, and retention policies.

Files in this directory are intentionally left blank until the corresponding services are implemented.
