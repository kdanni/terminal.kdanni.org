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
  if (!parts.length) {
    return '• No explicit constraints supplied.';
  }
  return parts.join('\n');
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
    `Reminder: ${context.riskReminder}.`,
    'For each candidate, cite how it satisfies the macro lens, include an exchange hint, and note the liquidity profile + OHLCV readiness explicitly.',
    schemaInstruction
  ].join('\n\n');
}

function buildFineTunePrompt(context = {}) {
  const constraintsBlock = formatConstraints(context.constraints);
  const metadataBlock = formatAssetMetadata(context.assetMetadata);
  const schemaInstruction = renderSchemaInstruction('FineTuneDecisions');

  return [
    'Phase: fine tuning.',
    'Transform the candidate proposals into final keep/drop/replace decisions and produce a watch list table ready for OHLCV monitoring.',
    'Inputs:',
    'Population proposal JSON:',
    '{{populationOutput}}',
    'Seeded asset metadata for cross-checking:',
    metadataBlock,
    'Constraints and reminders:',
    constraintsBlock,
    `Risk reminder: ${context.riskReminder}.`,
    'Rules:\n- Explicitly state keep/drop/replace decisions for every candidate, referencing metadata if you keep it.\n- Only replace when you can cite a liquidity-ready alternative.\n- Final watch list entries must include economic anchor, sentiment pulse, and confirm OHLCV readiness.\n- Close with the standard non-advice reminder verbatim.',
    schemaInstruction
  ].join('\n\n');
}

module.exports = {
  buildContextPrompt,
  buildPopulationPrompt,
  buildFineTunePrompt
};
