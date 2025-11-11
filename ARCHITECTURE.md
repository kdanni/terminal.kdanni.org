# ARCHITECTURE.md

## Overview
The system is built as a **modular, service-oriented architecture** focused on financial time series collection, normalization, storage, and retrieval.  
Each component is designed to operate independently while communicating through defined interfaces.  
The primary goal is to provide a **scalable, transparent data infrastructure** suitable for long-term historical storage and downstream analytics.

---

## High-Level Components
### 1. Collector Layer
**Purpose:**  
Fetch raw market data from multiple public/free-tier APIs and standardize it into a uniform internal format.

**Responsibilities:**
- Schedule API requests using cron or a lightweight job queue.
- Normalize data into canonical fields: `timestamp`, `open`, `high`, `low`, `close`, `volume`.
- Handle retries, error logging, and API rate limits.
- Write transformed data to the ingestion buffer (temporary staging table or queue).

**Implementation Notes:**
- Written in **Node.js (TypeScript)**.
- Each provider is implemented as a pluggable module with a common interface:
  ```ts
  interface DataProvider {
    name: string;
    fetch(symbol: string, interval: string): Promise<PriceRecord[]>;
  }
  ```
- Providers configured via YAML files: config/providers/*.yaml.

### 2. Storage Layer
**Purpose:**  
Persist normalized time series data for efficient retrieval, aggregation, and compression.

**Core Technology:**
PostgreSQL extended with TimescaleDB for hypertable support.

**Schema Outline:** 
- securities table stores instrument metadata.
- price_series hypertable stores OHLCV data.
- Optional derived_metrics table for precomputed analytics (moving averages, volatility, etc.).

**Key Features:**
- Hypertable partitioning by timestamp for performance.
- Continuous aggregates for common queries (e.g., daily summaries).
- Data retention and compression policies for long-term storage efficiency.

**Indexes:**
```sql
CREATE UNIQUE INDEX ON price_series (security_id, timestamp);
SELECT create_hypertable('price_series', 'timestamp');
```

### 3. API Gateway (optional in Phase 1)
**Purpose:**
Provide structured programmatic access to stored data.

**Responsibilities:**
- Expose REST or GraphQL endpoints for querying securities and time series.
- Support filtering (symbol, exchange, date range, interval).
- Aggregate data on the fly using TimescaleDB functions.

**Example Endpoints:**
```
GET /api/v1/securities/:symbol/prices?from=2022-01-01&to=2025-01-01&interval=1d
GET /api/v1/metrics/:symbol/moving-average?window=14
```

**Implementation Notes:**
- Node.js (Express or Fastify).
- Simple JWT or API key authentication.
- Supports pagination and JSON responses.


### 4. Orchestration Layer
**Purpose:**
Coordinate service deployment and configuration.

**Implementation:**
- Docker Compose manages containerized services:
 - `collector` service (Node.js)
 - `postgres` + `timescaledb` service
 - optional `api` service
 - `adminer` or `pgweb` for database inspection
- Example `.env` file stores configuration:
 ```
POSTGRES_USER=finance
POSTGRES_PASSWORD=finance
POSTGRES_DB=market_data
TIMESCALEDB_TELEMETRY=off
```
- Example `docker-compose.yml`:
 ```yaml
version: "3.9"
services:
  db:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_USER: finance
      POSTGRES_PASSWORD: finance
      POSTGRES_DB: market_data
    ports:
      - "5432:5432"
    volumes:
      - ./data:/var/lib/postgresql/data

  collector:
    build: ./collector
    depends_on:
      - db
    environment:
      - DATABASE_URL=postgres://finance:finance@db:5432/market_data
    command: ["npm", "run", "collect"]
```

### 5. Analytics & Visualization (Phase 2)
**Purpose:**
Provide a terminal-like interactive interface for data exploration and charting.

**Options:**
- Plug-and-play BI tools (Metabase, Superset).
- Custom GUI written in React + Plotly or ECharts.
- Connect directly to the API Gateway or database read replica.

**Planned Features:**
- Interactive candlestick charts.
- Aggregated watchlists.
- Cross-asset correlation heatmaps.
- Simple query editor with saved dashboards.

## Data Flow Summary
```
        +-------------------+
        |   Data Providers  |
        |  (AlphaVantage,   |
        |   Yahoo, FRED)    |
        +---------+---------+
                  |
                  v
         +------------------+
         |  Collector Layer |
         |  (Node.js tasks) |
         +------------------+
                  |
                  v
     +---------------------------+
     |  PostgreSQL + TimescaleDB |
     |  (price_series, metadata) |
     +---------------------------+
                  |
                  v
          +----------------+
          |   API Gateway  |
          | (REST/GraphQL) |
          +----------------+
                  |
                  v
         +--------------------+
         | Visualization / BI |
         | (Phase 2 terminal) |
         +--------------------+
```

## Security & Access Control
- Credentials and API keys stored in .env (never committed).
- Least-privilege DB roles: collectors have INSERT, analytics have SELECT.
- Optional API authentication via tokens or IP allow-list.
- Audit logs for ingestion timestamps and source tracking.

## Performance Considerations
- TimescaleDB hypertables allow horizontal scaling for large datasets.
- Batched inserts minimize write overhead.
- Continuous aggregates cache computed metrics.
- Data compression can reduce storage footprint by 90%+ for historical series.

## Future Extensions
- Task Queue: Use Redis or RabbitMQ to scale collection jobs.
- WebSocket Feed: Stream recent updates to frontend dashboards.
- Backtesting Module: Use stored data for simulation frameworks.
- Machine Learning Connector: Export data to Pandas/Arrow format for external models.

## Summary
This architecture provides a clear separation of concerns:
- Collector = acquisition
- Database = truth
- API = access
- Visualization = insight

The system’s modular design ensures each layer can be scaled, replaced, or extended independently while maintaining clean data lineage from source to screen.
