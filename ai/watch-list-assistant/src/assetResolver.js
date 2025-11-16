const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_EXCHANGE_ID = 'GLOBAL';
const FOREX_BASES = new Set(['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'NZD', 'CAD', 'CHF', 'CNY']);
const CRYPTO_BASES = new Set(['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE']);
const CRYPTO_QUOTES = new Set(['USD', 'USDT']);

const STATIC_ASSETS = [
  { symbol: 'AAPL', exchange_id: 'NASDAQ', aliases: ['APPLE', 'APPLE INC', 'APPLE INC.'] },
  { symbol: 'MSFT', exchange_id: 'NASDAQ', aliases: ['MICROSOFT', 'MICROSOFT CORP', 'MICROSOFT CORPORATION'] },
  { symbol: 'GOOGL', exchange_id: 'NASDAQ', aliases: ['ALPHABET', 'ALPHABET INC', 'GOOGLE'] },
  { symbol: 'AMZN', exchange_id: 'NASDAQ', aliases: ['AMAZON', 'AMAZON.COM', 'AMAZON COM'] },
  { symbol: 'NVDA', exchange_id: 'NASDAQ', aliases: ['NVIDIA', 'NVIDIA CORP', 'NVIDIA CORPORATION'] },
  { symbol: 'META', exchange_id: 'NASDAQ', aliases: ['FACEBOOK', 'META PLATFORMS', 'META PLATFORMS INC'] },
  { symbol: 'TSLA', exchange_id: 'NASDAQ', aliases: ['TESLA', 'TESLA INC'] },
  { symbol: 'JPM', exchange_id: 'NYSE', aliases: ['JPMORGAN', 'JP MORGAN', 'JPMORGAN CHASE'] },
  { symbol: 'SPY', exchange_id: 'NYSEARCA', aliases: ['S&P 500 ETF', 'SPDR S&P 500', 'SP500 ETF'] },
  { symbol: 'GLD', exchange_id: 'NYSEARCA', aliases: ['GOLD ETF', 'SPDR GOLD SHARES'] },
  { symbol: 'BTCUSD', exchange_id: 'BINANCE', aliases: ['BTC-USD', 'BTC/USD', 'BITCOIN'] },
  { symbol: 'ETHUSD', exchange_id: 'BINANCE', aliases: ['ETH-USD', 'ETH/USD', 'ETHEREUM'] },
  { symbol: 'SOLUSD', exchange_id: 'BINANCE', aliases: ['SOL-USD', 'SOL/USD', 'SOLANA'] },
  { symbol: 'EURUSD', exchange_id: 'FOREX', aliases: ['EUR/USD'] },
  { symbol: 'USDJPY', exchange_id: 'FOREX', aliases: ['USD/JPY'] },
  { symbol: 'US10Y', exchange_id: 'UST', aliases: ['10Y', 'UST 10Y', 'US TREASURY 10Y'] },
  { symbol: 'CL', exchange_id: 'NYMEX', aliases: ['WTI', 'WTI CRUDE', 'CRUDE OIL'] }
];

const AMBIGUOUS_SYMBOLS = {
  BABA: { exchanges: ['NYSE', 'HKEX'], preferred: 'NYSE' },
  RIO: { exchanges: ['NYSE', 'LSE'], preferred: 'NYSE' }
};

function safeReadSeedEntries() {
  const seedPath = path.resolve(__dirname, '../../../sql/seeds/timescale/watch_list_entries.sql');
  try {
    const contents = fs.readFileSync(seedPath, 'utf-8');
    const matches = contents.matchAll(/\('([A-Z0-9.:_-]+)',\s*'([A-Z0-9.:_-]*)'/g);
    const entries = [];
    for (const match of matches) {
      entries.push({
        symbol: match[1],
        exchange_id: match[2] || DEFAULT_EXCHANGE_ID,
        aliases: [match[1]]
      });
    }
    return entries;
  } catch (error) {
    return [];
  }
}

const CATALOG = [...safeReadSeedEntries(), ...STATIC_ASSETS];
const ALIAS_INDEX = buildAliasIndex(CATALOG);

function buildAliasIndex(assets) {
  const index = new Map();
  assets.forEach((asset) => {
    const aliasSet = new Set([asset.symbol, ...(asset.aliases || [])]);
    aliasSet.forEach((alias) => {
      const normalized = normalizeKey(alias);
      if (!normalized || index.has(normalized)) {
        return;
      }
      index.set(normalized, asset);
    });
  });
  return index;
}

function normalizeKey(value) {
  if (!value && value !== 0) {
    return '';
  }
  return String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeExchangeHint(value) {
  if (!value) {
    return undefined;
  }
  const normalized = String(value).trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }
  const remap = {
    NASDAQGS: 'NASDAQ',
    'NASDAQ GLOBAL SELECT': 'NASDAQ',
    'NYSE ARCA': 'NYSEARCA',
    'NEW YORK STOCK EXCHANGE': 'NYSE'
  };
  return remap[normalized] || normalized;
}

function isForexSymbol(symbol) {
  if (!symbol || symbol.length !== 6) {
    return false;
  }
  const base = symbol.slice(0, 3);
  const quote = symbol.slice(3);
  return FOREX_BASES.has(base) && FOREX_BASES.has(quote);
}

function isCryptoPair(symbol) {
  if (!symbol || symbol.length < 5) {
    return false;
  }
  const base = symbol.replace(/(USD|USDT)$/i, '');
  const quote = symbol.slice(base.length);
  return CRYPTO_BASES.has(base) && CRYPTO_QUOTES.has(quote);
}

function finalizeResolution(symbol, exchangeId, meta = {}, confidence = 'medium', method = 'fallback') {
  const normalizedSymbol = normalizeKey(symbol);
  const normalizedExchange = normalizeExchangeHint(exchangeId) || DEFAULT_EXCHANGE_ID;
  return {
    symbol: normalizedSymbol,
    exchange_id: normalizedExchange,
    confidence,
    method,
    meta: {
      ...meta,
      resolved_at: new Date().toISOString()
    }
  };
}

function resolveAmbiguous(symbol, exchangeHint) {
  const config = AMBIGUOUS_SYMBOLS[symbol];
  if (!config) {
    return undefined;
  }
  const normalizedHint = normalizeExchangeHint(exchangeHint);
  const exchangeId = normalizedHint && config.exchanges.includes(normalizedHint)
    ? normalizedHint
    : config.preferred || config.exchanges[0];
  return finalizeResolution(symbol, exchangeId, {
    ambiguous_candidates: config.exchanges,
    provided_exchange_hint: normalizedHint
  }, 'medium', 'ambiguous-fallback');
}

function tryForexHeuristic(symbol, exchangeHint) {
  if (!isForexSymbol(symbol)) {
    return undefined;
  }
  return finalizeResolution(symbol, 'FOREX', {
    heuristic: 'forex-pair',
    provided_exchange_hint: normalizeExchangeHint(exchangeHint)
  }, 'medium', 'forex');
}

function tryCryptoHeuristic(symbol, exchangeHint) {
  if (isCryptoPair(symbol)) {
    return finalizeResolution(symbol, 'BINANCE', {
      heuristic: 'crypto-pair',
      provided_exchange_hint: normalizeExchangeHint(exchangeHint)
    }, 'medium', 'crypto');
  }
  if (CRYPTO_BASES.has(symbol)) {
    return finalizeResolution(`${symbol}USD`, 'BINANCE', {
      heuristic: 'crypto-base',
      provided_exchange_hint: normalizeExchangeHint(exchangeHint)
    }, 'low', 'crypto');
  }
  return undefined;
}

function gatherAliasCandidates(candidate = {}) {
  const aliases = [];
  const symbol = candidate.symbol || candidate.ticker || '';
  if (symbol) {
    aliases.push(symbol);
    const colonParts = symbol.split(':');
    if (colonParts.length === 2) {
      aliases.push(colonParts[1]);
    }
    aliases.push(symbol.replace(/[:\-/ ]/g, ''));
  }
  if (candidate.exchange_hint && symbol) {
    aliases.push(`${candidate.exchange_hint}:${symbol}`);
  }
  if (candidate.name) {
    aliases.push(candidate.name);
  }
  if (candidate.economic_anchor) {
    const possibleSymbol = candidate.economic_anchor.match(/([A-Z]{1,5})/);
    if (possibleSymbol) {
      aliases.push(possibleSymbol[1]);
    }
  }
  return aliases.filter(Boolean);
}

function resolveAssetCandidate(candidate = {}) {
  const aliasCandidates = gatherAliasCandidates(candidate);
  for (const alias of aliasCandidates) {
    const normalized = normalizeKey(alias);
    if (!normalized) {
      continue;
    }
    const asset = ALIAS_INDEX.get(normalized);
    if (asset) {
      return finalizeResolution(asset.symbol, asset.exchange_id, {
        matched_alias: alias,
        provided_exchange_hint: normalizeExchangeHint(candidate.exchange_hint)
      }, 'high', 'catalog');
    }
  }

  const normalizedSymbol = normalizeKey(aliasCandidates[0] || candidate.symbol || candidate.name || '');
  if (normalizedSymbol) {
    const ambiguous = resolveAmbiguous(normalizedSymbol, candidate.exchange_hint);
    if (ambiguous) {
      return ambiguous;
    }
    const forex = tryForexHeuristic(normalizedSymbol, candidate.exchange_hint);
    if (forex) {
      return forex;
    }
    const crypto = tryCryptoHeuristic(normalizedSymbol, candidate.exchange_hint);
    if (crypto) {
      return crypto;
    }
  }

  return finalizeResolution(normalizedSymbol || 'UNMAPPED', normalizeExchangeHint(candidate.exchange_hint) || DEFAULT_EXCHANGE_ID, {
    matched_alias: null,
    provided_symbol: candidate.symbol || candidate.name || null
  }, 'low', 'fallback');
}

function resolveWatchListCandidates(entries = []) {
  return entries.map((entry, index) => {
    const resolution = resolveAssetCandidate(entry);
    return {
      index,
      candidate: entry,
      symbol: resolution.symbol,
      exchange: resolution.exchange_id,
      resolution
    };
  });
}

module.exports = {
  resolveAssetCandidate,
  resolveWatchListCandidates,
  DEFAULT_EXCHANGE_ID
};
