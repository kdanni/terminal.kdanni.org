# Collector Service Skeleton

This package provides the TypeScript workspace scaffold for the data ingestion layer described in `ARCHITECTURE.md` and `CONTEXT
.md`. At this stage, it simply verifies the bootstrapping flow by writing a startup log line.

## Scripts

- `npm run build` — Type-check and emit JavaScript output to `dist/`.
- `npm run start` — Execute the TypeScript entrypoint with `ts-node-esm`.
- `npm run start:prod` — Run the compiled output from the `dist/` directory.

## Next Steps

1. Define provider interfaces that encapsulate remote API communication.
2. Implement scheduling and retry primitives for continuous ingestion.
3. Introduce persistence adapters targeting PostgreSQL + TimescaleDB.
4. Expand logging and observability to cover ingestion metrics.
