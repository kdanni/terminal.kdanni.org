# Managed Schema Roadmap

## Current Initialization Approach
- The `collector` service owns schema bootstrap logic in [`collector/src/database.ts`](collector/src/database.ts).
- A pooled PostgreSQL connection is created lazily and shared through `getDatabasePool()`, with idle client error logging enabled for observability.
- Schema migrations are managed through filesystem-scanned SQL files split into `persistent` (one-shot) and `replaceable` (idempotent refresh) directories.
- Migration execution is manual: the code locks the `schema_migrations` table, checks for executed identifiers, and records execution results inside the same transaction.
- Replaceable migrations always re-run on startup, enabling views/materialized views/functions to be refreshed.

### Strengths
- Lightweight, dependency-free runtime (uses only `pg`).
- Deterministic migration ordering based on numeric prefixes.
- Simple to reason about for engineers comfortable with raw SQL.

### Gaps / Risks
- No schema diffing or introspection to catch drift.
- No migration generation tooling; developers must author SQL manually.
- Manual locking logic could become fragile under high concurrency or multiple services applying migrations simultaneously.
- Lacks environment-specific overrides (seed data, feature flags) and preview pipeline integrations.

## Frameworks for Managed Schema Lifecycle
Below are common frameworks that can replace or augment the current do-it-yourself system. Selection depends on required features (auto generation, type safety, cross-language use, cloud integration).

### JavaScript / TypeScript Ecosystem
- **Prisma Migrate**: Schema-first modeling language, generates SQL migrations automatically, tight integration with Prisma Client for type-safe access. Supports PostgreSQL and can embed raw SQL for advanced features.
- **TypeORM**: Decorator-based entity mapping with CLI-driven schema synchronization and migration generation. Allows raw SQL migrations and works well with NestJS/Express services.
- **Knex + Objection / Standalone**: Query builder with migration CLI. Offers fine-grained control and is minimal; migrations are JavaScript/TypeScript functions or raw SQL files.
- **Drizzle ORM**: Type-safe schema definitions in TypeScript with drizzle-kit handling migrations. Supports SQL migrations and flexible drivers.
- **sequelize-cli**: Mature ORM with migration support; models map to tables, migrations can be generated from model diffs.
- **db-migrate** / **node-pg-migrate**: Migration-focused libraries targeting PostgreSQL, allowing SQL or scripted migrations with dependency tracking.

### Language-Agnostic / CLI-Oriented
- **Flyway**: Widely adopted migration tool supporting SQL and Java-based migrations, baseline, repair, and drift detection. Integrates with CI/CD and multiple databases including PostgreSQL/Timescale.
- **Liquibase**: XML/JSON/YAML/SQL change logs, strong rollback support, diff tooling, and Pro features for policy enforcement.
- **Atlas**: Declarative schema management with automatic diffing and multi-env workflows; provides Terraform-like plans and supports PostgreSQL.
- **Sqitch**: Dependency-based change management using plain SQL scripts; strong fit for PostgreSQL ecosystems and extension management.

### Managed Cloud Providers
- **Neon branching**, **Supabase Migrations**, and **Hasura migrations** offer built-in pipelines for PostgreSQL, aligning schema changes with platform tooling.

## PostgreSQL + TimescaleDB Considerations
TimescaleDB extends PostgreSQL with hypertables, compression, and retention policies. Any framework must account for extension lifecycle and Timescale-specific objects.

### Core Requirements
1. **Extension Installation**: Ensure `CREATE EXTENSION IF NOT EXISTS timescaledb;` (and optional `timescaledb_toolkit`) executes before hypertable creation.
2. **Hypertable Creation**: `SELECT create_hypertable(...)` statements are typically part of migrations.
3. **Background Jobs & Policies**: Compression, retention, and continuous aggregates require scheduling functions (`add_retention_policy`, `add_compression_policy`, `refresh_continuous_aggregate`).
4. **Upgrade Handling**: Track TimescaleDB version compatibility with PostgreSQL upgrades.

### Implementation Options
- **Raw SQL Migrations (Status Quo)**
  - Keep existing structure; add SQL scripts that manage extensions, hypertables, and policies explicitly.
  - Introduce conventions for upgrade scripts (e.g., `persistent/010_create_hypertables.sql`).
  - Pros: Maximum control, minimal tooling changes. Cons: Still manual; lacks validation.

- **Flyway or Liquibase with SQL Change Sets**
  - Continue writing raw SQL but gain lifecycle tooling, drift detection, and CI integration.
  - Both support executing `CREATE EXTENSION` and stored procedure calls; no special Timescale integration needed beyond SQL scripts.

- **Prisma / Drizzle with Custom SQL Hooks**
  - Use ORM schema definition for standard tables; embed raw SQL migrations for hypertables and policies.
  - Prisma currently requires raw SQL migrations for Timescale features but offers migration history and introspection.

- **Sqitch or node-pg-migrate**
  - Provide dependency graph of migrations, enabling explicit ordering (e.g., `timescaledb` extension migration before hypertable creation).
  - Scripts remain SQL, but tooling ensures dependency enforcement and plan review.

- **TimescaleDB Toolkit / Managed Services**
  - Timescale Cloud includes migration utilities and background job dashboards; combine with `psql` or Flyway for deploy pipelines.
  - For Kubernetes, pair with `timescaledb-multinode` Helm charts and use operator-managed upgrade hooks.

## Recommendations & Next Steps
1. **Decide on Tooling Level**
   - If minimal change desired, enhance current logic with additional checks (drift detection, logging, multi-instance safeguards).
   - For managed lifecycle, evaluate Flyway vs Prisma/Drizzle depending on desire for ORM.

2. **Prototype Integration**
   - Create proof-of-concept migrating existing SQL files into candidate tool, confirming Timescale-specific commands run cleanly.
   - Validate compatibility with CI/CD and secrets management.

3. **Define Migration Ownership**
   - Establish conventions: environment gating, rollback strategy, review process, and release timelines.

4. **Document Timescale Patterns**
   - Maintain guidelines for hypertable creation, compression policies, retention, and upgrade steps in a shared engineering playbook.

5. **Automate Verification**
   - Add automated smoke tests invoking migration runner against ephemeral PostgreSQL + Timescale containers (e.g., via Docker Compose).

