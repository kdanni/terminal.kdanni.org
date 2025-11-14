# Exchange and Asset Ranking Findings

## Overview
This document outlines the approach and preliminary findings for ranking cryptocurrency exchanges and assets. The objective is to identify high-priority entities for data collection efforts focused on reliable market coverage with manageable scope.

## Ranking Objectives
- **Prioritize data coverage**: Ensure the most influential exchanges and assets are monitored to maximize market insight.
- **Constrain data scope**: Start with a limited subset of entities to validate ingestion, normalization, and monitoring workflows before scaling.
- **Enable repeatability**: Use transparent, data-driven criteria so rankings can be refreshed on a regular cadence.

## Exchange Ranking Criteria
| Criterion | Description | Data Signals | Notes |
| --- | --- | --- | --- |
| Trade Volume | Average daily spot trading volume. | 24h/30d USD volume, reported & adjusted metrics. | Use adjusted metrics when available to limit wash trading impact. |
| Market Coverage | Breadth and depth of listed assets and trading pairs. | Number of assets/pairs, support for fiat/stablecoin ramps. | Focus on listings with reliable liquidity. |
| Liquidity Quality | Order book depth and slippage at various notional sizes. | Top-of-book spread, 1% depth, volume profile. | Helps avoid thin markets that skew pricing. |
| Regulatory & Compliance | Exchange reputation, licensing, jurisdictional access. | Licensing records, regulatory actions, KYC/AML posture. | Impacts operational risk and data reliability. |
| Technical & API Reliability | Stability of market data APIs, uptime, latency. | Historical uptime, API versioning, rate limits. | Critical for sustained data collection. |
| Counterparty Risk | Institutional safety measures, custody, insurance. | Proof-of-reserves, security incidents, insurance coverage. | Lower risk improves trust in data continuity. |

### Recommended Data Sources
- CoinGecko / CoinMarketCap aggregated metrics for volume and market coverage.
- Kaiko, Coin Metrics, or Amberdata for institutional-grade liquidity and API performance metrics.
- Regulatory databases (FINRA, FCA, MAS, etc.) for compliance status.
- Exchange self-disclosures, status pages, and incident reports for qualitative signals.

## Asset Ranking Criteria
| Criterion | Description | Data Signals | Notes |
| --- | --- | --- | --- |
| Market Capitalization | Free-float or circulating market cap as a proxy for economic significance. | 24h-averaged circulating supply * price. | Prefer free-float market cap to reduce distortion from locked tokens. |
| Trading Volume | Average spot and derivatives volume. | 24h/30d USD volume across major exchanges. | Helps filter illiquid or manipulated assets. |
| Liquidity Depth | Order book depth across major trading venues. | Aggregated depth at multiple price levels. | Ensures reliable pricing for benchmarks. |
| Volatility & Stability | Historical volatility and drawdown profiles. | 30d/90d realized volatility, Sharpe/Sortino ratios. | Balance between stability and activity depending on use case. |
| Network & Ecosystem Health | On-chain activity, developer traction, ecosystem adoption. | Active addresses, transaction volume, GitHub commits, DeFi TVL. | Highlights sustainable asset demand. |
| Risk & Compliance | Regulatory posture, securities risk, concentration metrics. | Enforcement actions, token distribution, whale concentration. | Reduces exposure to delisting or regulatory shocks. |

### Recommended Data Sources
- CoinGecko, CoinMarketCap, Messari for market cap and volume statistics.
- Kaiko, Coin Metrics, Amberdata for liquidity depth and derivatives data.
- Glassnode, Token Terminal, DefiLlama for on-chain and ecosystem metrics.
- Chainalysis, TRM Labs for compliance and risk monitoring insights.

## Ranking Methodology
1. **Data Ingestion**: Collect standardized metrics for each criterion from the recommended sources. Apply normalization to account for differing scales and reporting methodologies.
2. **Weighting Scheme**: Assign weights to each criterion according to business priorities. Suggested initial weighting:
   - Trade Volume / Market Capitalization: 25%
   - Liquidity Quality / Depth: 20%
   - Market Coverage / Ecosystem Health: 15%
   - Regulatory & Compliance: 15%
   - Technical & API Reliability: 15%
   - Counterparty Risk / Risk & Compliance: 10%
3. **Scoring**: Compute composite scores per exchange and per asset using weighted averages. Use z-score normalization to handle outliers.
4. **Ranking & Thresholding**: Sort entities by composite score and select a tier (e.g., top 1 exchange, top 7 assets) for the proof of concept.
5. **Review & Adjustment**: Periodically review rankings with domain experts, adjusting weights or adding qualitative overrides when needed.

## Proof of Concept Scope
- **Exchange Selection**: Binance ranks first under the proposed criteria due to its leading adjusted trade volume, broad market coverage, deep liquidity, and robust API suite.
- **Asset Selection**: Top assets listed on Binance by market cap and liquidity include:
  1. Bitcoin (BTC)
  2. Ethereum (ETH)
  3. Tether (USDT)
  4. Binance Coin (BNB)
  5. XRP (XRP)
  6. Solana (SOL)
  7. USD Coin (USDC)

These assets provide a balanced mix of store-of-value, smart-contract platforms, and stablecoins, covering a significant share of global crypto market activity.

## Data Collection Plan (Limited Scope)
1. **API Endpoints**: Use Binance REST/WebSocket APIs for spot market data (ticker, trades, order book snapshots) on the seven assets against USD/USDT pairs.
2. **Data Frequency**: Capture tick-level trades and best bid/ask every second; aggregate to 1-minute candles for downstream analysis.
3. **Storage & Schema**: Map collected data into existing market data schemas (see `docs/SCHEMA.md`) focusing on trades, order books, and OHLCV summaries.
4. **Quality Checks**: Implement validation for missing intervals, anomalous spikes, and volume mismatches. Cross-reference with secondary aggregators (e.g., Coin Metrics) for sanity checks.
5. **Reporting**: Produce daily dashboards summarizing volume, price movements, and data quality KPIs. Highlight anomalies and potential sources of data drift.

## Next Steps
- Prototype the ingestion pipeline with the selected exchange and assets.
- Monitor performance and refine criteria or weights based on observed data quality.
- Prepare to scale by onboarding additional exchanges and assets once the POC validates the approach.

