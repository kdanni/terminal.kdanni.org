# Project Roadmap

## Purpose
This roadmap summarizes the immediate priorities and staged initiatives for terminal.kdanni.org based on the current project documentation. It focuses on enabling a reliable development environment, completing foundational data infrastructure, and preparing the application layer for production workloads.

## Phase 1 – Development Environment Enablement ✅ Completed
1. **Provision containerized databases**: Create a `docker-compose.yaml` for local development that runs both the MySQL master-data database image and the PostgreSQL + TimescaleDB time-series image, including persistent volumes, environment variables, and initialized networks.
2. **Document environment bootstrap**: Extend `README.md` with steps for starting the compose stack, seeding schemas, and stopping services.
3. **Automate schema application**: Wire the existing `npm run dbinstall` flow to run inside the containers and document how to apply Timescale scripts.

## Phase 2 – Data Layer Hardening ✅ Completed
1. **Validate SQL migration idempotency**: Added a disposable-database verification flow (`npm run db:verify`) that replays the production scripts twice and enforces `IF NOT EXISTS` coverage in the Timescale schema.
2. **Integrate Timescale schema management**: Introduced a Postgres/Timescale runner (`npm run timescale:migrate`) built on the shared SQL file tooling so Timescale migrations can execute alongside MySQL installs.
3. **Establish seed data process**: Created reusable seeding scripts for both databases (`npm run seed:mysql`, `npm run seed:timescale`, and `npm run seed:all`) stocked with anonymized canonical datasets and documented in the contributor guides.

## Phase 3 – Service Layer for Asset Catalog Completion ✅ Completed
1. **Finalize DB install task**: Complete the implementation under `src/db-install/` to cover all schema layers, including error handling and logging.
2. **Implement Twelve Data ingestion tasks**: Build out the collectors 

## Phase 3 b - Service Layer for Exchange Catalog
1. **Find API otions query Exchange informaton**: Free tier API provide information about exchanges.
2. **Create Exchange Catalog DB layer**
 - Create Master Data TABLE for Exchangeinfo and related entities if any.
 - Create Upsert SP.
3. **Initialize the domain logic**: `src/<provider>/exchange-catalog`
4. **Implement Exchange Catalog ingestion tasks**


## Phase 4 – API & Presentation Readiness
1. **Harden Express service**: Implement the REST API routes in `src/api/`, including validation, pagination, and security headers per best practices.
2. **Introduce integration tests**: Expand the placeholder `test/` directory with coverage for core API flows and database interactions, leveraging a test compose stack.
3. **Document operational playbooks**: Produce runbooks for common operational scenarios (deployments, rollbacks, data restores) building on `docs/TESTPLAN.md`.

## Phase 5 – Observability & Deployment
1. **Add logging and metrics pipeline**: Standardize log formats and integrate metrics exporters for both Node services and databases.
2. **Define CI/CD pipeline**: Configure automation for linting, testing, image builds, and deployment packaging.
3. **Plan production infrastructure**: Document target hosting, networking, and backup strategies aligned with the modular architecture.

## Continuous Activities
- **Documentation upkeep**: Keep architecture, schema, and test plan documents synchronized with implementation changes.
- **Security review**: Periodically review dependencies and credentials, ensuring `.env` handling matches best practices.
- **Feedback loop**: Revisit and reprioritize roadmap items based on stakeholder feedback and observed system performance.
