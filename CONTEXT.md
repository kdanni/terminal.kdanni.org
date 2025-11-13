# CONTEXT.md

## Project Overview
This project implements a **personal Bloomberg Terminal–style application** focused on **collecting, storing, and analyzing financial time series data** using free-tier data provider APIs. The system is designed for modularity: data ingestion, storage, and presentation layers are decoupled so that each component can evolve independently.

The initial goal (Phase 1) is to build a **robust time series data backend** that aggregates, normalizes, and stores securities data from multiple public APIs.  
Phase 2 will integrate **Business Intelligence (BI) and visualization tools** to create an interactive, analyst-friendly terminal interface.

---

## Architecture Summary
**Phase 1 – Core Infrastructure**
- **Storage Layer:**  
  MySql as the master data store.
  PostgreSQL + TimescaleDB extension as the canonical time series store.  
  Schema design emphasizes consistent symbol mapping and time alignment.
- **Collector Layer:**  
  Modular fetchers and normalizers for free-tier financial APIs (e.g., Alpha Vantage, Yahoo Finance, Twelve Data).  
  Responsible for rate limiting, caching, retry policies, and standardizing data formats.
- **API Gateway (optional):**  
  A thin Node.js service exposing normalized time series through REST or GraphQL for future consumers.

**Phase 2 – Visualization Layer**
- **Storage Layer:**  
 - Optimized for historical price data, OHLCV series, and derived indicators.    
- **BI Layer:**  
 - Decoupled BI front end (e.g., Metabase, Apache Superset, or a custom React + Plotly dashboard).  
 - Communicates with the backend via the public API.  
 - Supports watchlists, charting, and analytics queries over historical and intraday data.

---

## Design Principles
- **Modularity:** Each component (collector, storage, analytics, UI) should be deployable and maintainable independently.  
- **Reproducibility:** All collected data and transformations must be traceable to source and timestamp.  
- **Extensibility:** Adding a new data provider should require minimal configuration.  
- **Cost Awareness:** Only free-tier or open APIs are used in Phase 1. Paid integrations can be added later behind feature flags.  
- **Transparency:** All computations (resampling, aggregation, normalization) should be explicitly defined in code or schema.

---

## Core Technologies
| Component | Technology | Purpose |
|------------|-------------|----------|
| Master data database   | MySql | Low complexity and affordable data store. |
| Time series store   | PostgreSQL + TimescaleDB | Efficient time series storage |
| Ingestion  | Node.js (vanilla javascript) | On shot collection tasks, API integration |
| Scheduling  | CRON or SystemD triggered npm tasks | Flexible schedulding options for many deployment environment |
| Orchestration | Docker / Docker Compose | Reproducible environment |
| Configuration | ENV files | Provider keys, scheduling, retention policies |
| Phase 2 BI | Metabase / Superset / Custom UI | Visualization & analytics |

---

## Non-Goals (for now)
- No paid or proprietary data feeds  
- No live trading or brokerage integrations  
- No machine learning predictions (only data storage and retrieval)

---

## Long-Term Vision
Create a self-hosted, extensible platform for financial data enthusiasts, analysts, and developers. The system aims to provide the backbone of a “personal market intelligence terminal”: reliable data ingestion, powerful time series storage, and an open visualization layer where custom analytics can flourish.


