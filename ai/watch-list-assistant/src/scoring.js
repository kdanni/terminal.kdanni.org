const DEFAULT_MARKET_CAP_RANGE = { min: 50, max: 3000 }; // in billions USD
const DEFAULT_SENTIMENT_RANGE = { min: -5, max: 5 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalize(value, { min, max }) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

function formatNumber(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'n/a';
  }
  return value.toFixed(1);
}

function buildPriorityScorecard({
  candidates = [],
  existingHoldings = [],
  apiQuotaSlack = 1,
  marketCapRange = DEFAULT_MARKET_CAP_RANGE,
  sentimentRange = DEFAULT_SENTIMENT_RANGE
} = {}) {
  const holdingSet = new Set((existingHoldings || []).map((symbol) => symbol.toUpperCase()));
  const quotaWeight = clamp(apiQuotaSlack ?? 1, 0.25, 1.25);

  const scores = candidates.map((candidate) => {
    const symbol = candidate.symbol || 'UNKNOWN';
    const marketCapBillions = Number(candidate.market_cap_usd ?? candidate.market_cap_billions ?? 0);
    const sentimentVelocity = Number(candidate.sentiment_velocity ?? 0);

    const marketCapScore = normalize(marketCapBillions, marketCapRange);
    const sentimentScore = normalize(sentimentVelocity, sentimentRange);
    const holdingPenalty = holdingSet.has(symbol.toUpperCase()) ? 0.15 : 0;

    const weighted =
      0.55 * marketCapScore +
      0.35 * sentimentScore +
      0.1 * (1 - holdingPenalty);

    const priorityScore = clamp(weighted * quotaWeight, 0, 1) * 100;

    return {
      symbol,
      market_cap_billions: marketCapBillions,
      sentiment_velocity: sentimentVelocity,
      holding_penalty: holdingPenalty,
      quota_weight: quotaWeight,
      priority_score: Number(priorityScore.toFixed(1)),
      rationale: `Market cap ${formatNumber(marketCapBillions)}B, sentiment velocity ${formatNumber(
        sentimentVelocity
      )}, holdings adjustment ${holdingPenalty > 0 ? '-15%' : 'none'}, quota weight ${formatNumber(quotaWeight)}x.`
    };
  });

  scores.sort((a, b) => b.priority_score - a.priority_score);

  return {
    scores,
    quota_weight: quotaWeight
  };
}

function formatScorecard(scorecard = {}, maxAssets) {
  if (!scorecard.scores?.length) {
    return 'No population proposals available to score yet.';
  }

  const limitNote = maxAssets ? `Top ${maxAssets} assets will be kept due to the data-collection quota.` : 'No data-collection cap supplied; prioritize highest scores.';

  const rows = scorecard.scores
    .map(
      (entry, index) =>
        `${index + 1}. ${entry.symbol}: ${entry.priority_score} priority — ${entry.rationale}`
    )
    .join('\n');

  return [
    'Priority scorecard (market cap + sentiment velocity + holdings/quota adjustments):',
    rows,
    `Quota weight applied: ${formatNumber(scorecard.quota_weight)}x. ${limitNote}`
  ].join('\n');
}

module.exports = {
  buildPriorityScorecard,
  formatScorecard
};
