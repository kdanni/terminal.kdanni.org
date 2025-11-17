const { renderSchemaInstruction } = require('./structured-output');

function formatConstraints(constraints = {}) {
  const parts = [];
  if (constraints.routerQuota) {
    parts.push(`• Router quota: ${constraints.routerQuota}`);
  }
  if (constraints.latencyBudget) {
    parts.push(`• Latency budget: ${constraints.latencyBudget}`);
  }
  if (constraints.olhcvRequirement) {
    parts.push(`• OHLCV readiness: ${constraints.olhcvRequirement}`);
  }
  if (constraints.dataCollectionQuota) {
    parts.push(`• Data-collection quota: ${constraints.dataCollectionQuota}`);
  }
  if (!parts.length) {
    return '• No explicit constraints supplied.';
  }
  return parts.join('\n');
}

function formatQuota(quota = {}) {
  if (!quota || typeof quota !== 'object') {
    return 'No collection quota supplied.';
  }

  const parts = [];
  if (typeof quota.maxAssets === 'number') {
    parts.push(`Max assets: ${quota.maxAssets}`);
  }
  if (typeof quota.apiQuotaSlack === 'number') {
    parts.push(`API quota slack multiplier: ${quota.apiQuotaSlack}`);
  }
  if (quota.note) {
    parts.push(`Note: ${quota.note}`);
  }

  if (!parts.length) {
    return 'No collection quota supplied.';
  }
  return parts.join(' — ');
}

function formatAssetMetadata(assetMetadata = []) {
  if (!Array.isArray(assetMetadata) || assetMetadata.length === 0) {
    return '- No seeded asset metadata yet.';
  }
  return assetMetadata
    .map((asset) => {
      const readiness = asset.olhcvReady ? 'ready' : 'not ready';
      return `- ${asset.symbol} (${asset.exchange}): ${asset.theme || 'macro relevance TBD'} — ${asset.liquidity}, ${readiness} for OHLCV capture.`;
    })
    .join('\n');
}

function buildContextPrompt(context = {}) {
  const constraintsBlock = formatConstraints(context.constraints);
  const metadataBlock = formatAssetMetadata(context.assetMetadata);
  const schemaInstruction = renderSchemaInstruction('ContextSummary');

  return [
    'Phase: context seeding.',
    `Macro debate focus: ${context.macroFocus}.`,
    `Sentiment lens guidance: ${context.sentimentLens}.`,
    'Operational constraints to honor:',
    constraintsBlock,
    'Previously extracted asset metadata that should be referenced when relevant:',
    metadataBlock,
    'Tasks:\n1. Summarize the dominant macro debate around the stated focus.\n2. Call out policy, liquidity, and rotation forces as discrete macro themes.\n3. Document how router/API constraints and OHLCV readiness influence the screening posture.\n4. Explain in one sentence how the sentiment lens guides later phases.',
    schemaInstruction
  ].join('\n\n');
}

function buildPopulationPrompt(context = {}) {
  const constraintsBlock = formatConstraints(context.constraints);
  const metadataBlock = formatAssetMetadata(context.assetMetadata);
  const quotaBlock = formatQuota(context.dataCollectionQuota);
  const schemaInstruction = renderSchemaInstruction('PopulationProposals');

  return [
    'Phase: population.',
    'You must propose 4-6 U.S. equities spanning mega-cap, growth, and defensive tilts.',
    'Use the structured context summary below plus the seeded asset metadata to avoid redundancy and to confirm OHLCV readiness.',
    'Context summary JSON:',
    '{{contextSeedingOutput}}',
    'Seeded asset metadata:',
    metadataBlock,
    'Operational constraints to respect:',
    constraintsBlock,
    `Data-collection guardrails: ${quotaBlock}. Include market_cap_usd (billions) and sentiment_velocity (-5 to +5) so the scorecard can be computed locally.`,
    `Reminder: ${context.riskReminder}.`,
    'For each candidate, cite how it satisfies the macro lens, include an exchange hint, note the liquidity profile + OHLCV readiness explicitly, and supply numeric market cap plus sentiment velocity.',
    schemaInstruction
  ].join('\n\n');
}

function buildFineTunePrompt(context = {}) {
  const constraintsBlock = formatConstraints(context.constraints);
  const metadataBlock = formatAssetMetadata(context.assetMetadata);
  const quotaBlock = formatQuota(context.dataCollectionQuota);
  const schemaInstruction = renderSchemaInstruction('FineTuneDecisions');

  return [
    'Phase: fine tuning.',
    'Transform the candidate proposals into final keep/drop/replace decisions and produce a watch list table ready for OHLCV monitoring.',
    'Inputs:',
    'Population proposal JSON:',
    '{{populationOutput}}',
    'Seeded asset metadata for cross-checking:',
    metadataBlock,
    'Local priority scorecard (computed from market cap + sentiment velocity + holdings/quota adjustments):',
    '{{scorecard}}',
    'Constraints and reminders:',
    constraintsBlock,
    `Data-collection guardrails: ${quotaBlock}. Respect the max asset count ({{maxAssets}}) and explain exclusions.`,
    `Risk reminder: ${context.riskReminder}.`,
    'Rules:\n- Explicitly state keep/drop/replace decisions for every candidate, referencing metadata if you keep it.\n- Only replace when you can cite a liquidity-ready alternative.\n- Use the scorecard to explain trade-offs and note when a lower-ranked asset is replaced by a higher-ranked alternative.\n- Final watch list entries must include economic anchor, sentiment pulse, and confirm OHLCV readiness.\n- Cap final_watch_list to the max asset count and populate excluded_assets with reasons (quota or qualitative).\n- Include priority_scores summarizing the provided scorecard.\n- Close with the standard non-advice reminder verbatim.',
    schemaInstruction
  ].join('\n\n');
}

module.exports = {
  buildContextPrompt,
  buildPopulationPrompt,
  buildFineTunePrompt
};
