# REST API Contracts

These contracts formalize the JSON envelopes shared across the frontend and backend. They cover the catalog, watch list, user profile, and OHLCV endpoints referenced by the GUI and establish consistent pagination and error shapes.

## Conventions

- Successful responses wrap data inside a `data` property. Pagination metadata is returned under `pagination` with the following keys:
  - `total` – total matching records.
  - `totalPages` – total pages available for the requested `pageSize`.
  - `page` – 1-based page requested (defaults to `1`).
  - `pageSize` – items per page (defaults to `25` unless noted).
- Empty result sets return `data: []` with a valid `pagination` object (e.g., `total: 0`, `totalPages: 0`).
- Errors return a non-2xx status code and the shape `{ "error": { "code": string, "message": string, "details"?: object | string } }`. When possible include the HTTP status code in `error.code` (e.g., `"BAD_REQUEST"`, `"UNAUTHORIZED"`, `"NOT_FOUND"`).
- Requests that require authentication use the Auth0 bearer token provided by the frontend. A missing or invalid token should return `401` with the above error envelope.

## Asset catalog search and pagination

**Endpoint:** `GET /api/assets`

**Query params:**
- `search` (optional) – free-text search across symbol, name, exchange, currency, or country.
- `page` (optional, default `1`) – 1-based page.
- `pageSize` (optional, default `25`) – number of results per page.

**Success response (200):**
```json
{
  "data": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "assetType": "Equity",
      "exchange": "NASDAQ",
      "currency": "USD",
      "country": "US",
      "type": "Common Stock",
      "watched": true,
      "watchListId": 42
    }
  ],
  "pagination": {
    "total": 24000,
    "totalPages": 960,
    "page": 1,
    "pageSize": 25
  }
}
```

**Empty response (200):**
```json
{
  "data": [],
  "pagination": {
    "total": 0,
    "totalPages": 0,
    "page": 1,
    "pageSize": 25
  }
}
```

**Common errors:**
- `400` for malformed pagination values (non-numeric `page`/`pageSize`).
- `401`/`403` for missing or insufficient authorization.

## Asset classes overview

**Endpoint:** `GET /api/assets/classes`

Lists the distinct asset classes in the catalog with record counts. Useful for
driving navigation to class-specific data tables.

**Success response (200):**

```json
{
  "data": [
    { "assetType": "stock", "total": 10 },
    { "assetType": "etf", "total": 2 }
  ]
}
```

**Errors:**
- `401`/`403` for authorization issues.

## Watch list retrieval

**Endpoint:** `GET /api/watch-list`

**Query params:**
- `page` (optional, default `1`).
- `pageSize` (optional, default `50`).

**Success response (200):**
```json
{
  "data": [
    {
      "watchListId": 42,
      "symbol": "AAPL",
      "exchange": "NASDAQ",
      "watched": true,
      "updatedAt": "2024-09-01T12:34:56.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "totalPages": 1,
    "page": 1,
    "pageSize": 50
  }
}
```

**Errors:**
- `401`/`403` for unauthorized access.

## Watch list toggle

**Endpoint:** `POST /api/watch-list/toggle`

**Request body:**
```json
{
  "symbol": "AAPL",
  "exchange": "NASDAQ",
  "watched": true
}
```

**Success response (200):**
```json
{
  "data": {
    "symbol": "AAPL",
    "exchange": "NASDAQ",
    "watched": true,
    "watchListId": 42,
    "updatedAt": "2024-09-01T12:34:56.000Z"
  }
}
```

**Errors:**
- `400` for missing `symbol`.
- `404` when the asset cannot be found.
- `401`/`403` for authorization issues.

## User profile / token validation

**Endpoint:** `GET /api/me`

Used by the frontend to validate the Auth0 access token and display the current user.

**Success response (200):**
```json
{
  "data": {
    "sub": "auth0|abc123",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "picture": "https://example.com/avatar.png",
    "roles": ["viewer"]
  }
}
```

**Errors:**
- `401` when the token is missing or invalid.

## OHLCV data retrieval

**Endpoint:** `GET /api/ohlcv`

**Query params:**
- `symbol` (required) – ticker symbol.
- `interval` (required) – sampling interval (e.g., `1d`, `1h`, `5m`).
- `range` (required) – time window (e.g., `1mo`, `3mo`, `1y`).
- `page` (optional, default `1`).
- `pageSize` (optional, default `500`).

**Success response (200):**
```json
{
  "data": {
    "symbol": "AAPL",
    "interval": "1d",
    "range": "1mo",
    "candles": [
      {
        "timestamp": "2024-08-01T00:00:00.000Z",
        "open": 187.12,
        "high": 189.02,
        "low": 185.98,
        "close": 188.77,
        "volume": 51234567
      }
    ]
  },
  "pagination": {
    "total": 22,
    "totalPages": 1,
    "page": 1,
    "pageSize": 500
  }
}
```

**Empty response (200):**
```json
{
  "data": {
    "symbol": "AAPL",
    "interval": "1d",
    "range": "1mo",
    "candles": []
  },
  "pagination": {
    "total": 0,
    "totalPages": 0,
    "page": 1,
    "pageSize": 500
  }
}
```

**Errors:**
- `400` when `symbol`, `interval`, or `range` is missing or invalid.
- `404` when the symbol is unknown.
- `401`/`403` for authorization failures.
