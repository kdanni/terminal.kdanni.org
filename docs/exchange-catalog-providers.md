# Exchange Catalog Provider Evaluation

To deliver global exchange metadata without incurring additional subscription costs, the project evaluated publicly documented APIs with free tiers. The goal was to identify an immediately usable provider for the initial implementation and outline an alternative in case requirements grow.

## Twelve Data
- **Endpoint**: `https://api.twelvedata.com/exchanges`
- **Authentication**: Requires the same API key already used for existing Twelve Data integrations (`TWELVE_DATA_API_KEY`).
- **Coverage**: Returns equities and derivatives venues with market identifier codes, region metadata, and trading hours context.
- **Free-tier limits**: 8 requests per minute, 800 requests per day. These limits match the asset catalog workflows already in place, simplifying scheduling.
- **Notes**: Responses follow the familiar `data` array structure used by other Twelve Data catalog endpoints, reducing transformation effort.

## Financial Modeling Prep (FMP)
- **Endpoint**: `https://financialmodelingprep.com/api/v3/is-the-market-open`
- **Authentication**: Requires an API key passed via the `apikey` query parameter.
- **Coverage**: Provides reference data for major exchanges, including name, timezone, and trading status. Historical venue metadata is available through additional endpoints.
- **Free-tier limits**: 250 requests per day on the community plan; bursts are limited to roughly 5 requests per minute.
- **Notes**: FMP’s schema differs from Twelve Data’s catalog format, so mapping functions would be required. It remains a viable fallback if future requirements demand redundant data sources.

The Twelve Data exchange catalog meets current needs and reuses existing credentials, so it has been selected for Phase 3b implementation.
