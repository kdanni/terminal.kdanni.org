const SCHEMAS = {
  ContextSummary: {
    example: {
      schema_name: 'ContextSummary',
      macro_themes: [
        {
          headline: 'Liquidity bifurcates mega-cap vs. cyclical spending',
          policy_driver: 'FOMC signaling and Treasury supply guidance'
        }
      ],
      api_limitations: {
        quota_limit: 'Hugging Face router allows ~3 completions/minute',
        latency_budget: 'UI polls every 15 seconds',
        olhcv_requirement: 'Assets must be OHLCV ready with exchange routing'
      },
      sentiment_guidance: 'Explain how sentiment lenses shape the screen'
    },
    validate(payload) {
      const errors = [];
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        errors.push('Root payload must be a JSON object.');
        return errors;
      }
      if (payload.schema_name !== 'ContextSummary') {
        errors.push('schema_name must equal "ContextSummary".');
      }
      if (!Array.isArray(payload.macro_themes) || payload.macro_themes.length === 0) {
        errors.push('macro_themes must be a non-empty array.');
      } else {
        payload.macro_themes.forEach((theme, index) => {
          if (!theme || typeof theme !== 'object') {
            errors.push(`macro_themes[${index}] must be an object.`);
            return;
          }
          if (typeof theme.headline !== 'string' || !theme.headline.trim()) {
            errors.push(`macro_themes[${index}].headline must be a string.`);
          }
          if (typeof theme.policy_driver !== 'string' || !theme.policy_driver.trim()) {
            errors.push(`macro_themes[${index}].policy_driver must be a string.`);
          }
        });
      }
      if (!payload.api_limitations || typeof payload.api_limitations !== 'object') {
        errors.push('api_limitations must be an object.');
      } else {
        ['quota_limit', 'latency_budget', 'olhcv_requirement'].forEach((key) => {
          if (typeof payload.api_limitations[key] !== 'string' || !payload.api_limitations[key].trim()) {
            errors.push(`api_limitations.${key} must be a non-empty string.`);
          }
        });
      }
      if (typeof payload.sentiment_guidance !== 'string' || !payload.sentiment_guidance.trim()) {
        errors.push('sentiment_guidance must be a non-empty string.');
      }
      return errors;
    }
  },
  PopulationProposals: {
    example: {
      schema_name: 'PopulationProposals',
      candidates: [
        {
          symbol: 'AAPL',
          exchange_hint: 'NASDAQ',
          liquidity_profile: 'mega-cap',
          rationale: 'Describes why symbol matters for the macro lens',
          olhcv_ready: true
        }
      ],
      derived_from_metadata: ['AAPL', 'MSFT']
    },
    validate(payload) {
      const errors = [];
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        errors.push('Root payload must be a JSON object.');
        return errors;
      }
      if (payload.schema_name !== 'PopulationProposals') {
        errors.push('schema_name must equal "PopulationProposals".');
      }
      if (!Array.isArray(payload.candidates) || payload.candidates.length < 4) {
        errors.push('candidates must include at least four entries.');
      } else {
        payload.candidates.forEach((candidate, index) => {
          if (!candidate || typeof candidate !== 'object') {
            errors.push(`candidates[${index}] must be an object.`);
            return;
          }
          ['symbol', 'exchange_hint', 'liquidity_profile', 'rationale'].forEach((key) => {
            if (typeof candidate[key] !== 'string' || !candidate[key].trim()) {
              errors.push(`candidates[${index}].${key} must be a non-empty string.`);
            }
          });
          if (typeof candidate.olhcv_ready !== 'boolean') {
            errors.push(`candidates[${index}].olhcv_ready must be boolean.`);
          }
        });
      }
      if (!Array.isArray(payload.derived_from_metadata)) {
        errors.push('derived_from_metadata must be an array.');
      }
      return errors;
    }
  },
  FineTuneDecisions: {
    example: {
      schema_name: 'FineTuneDecisions',
      actions: [
        {
          symbol: 'AAPL',
          decision: 'keep',
          reason: 'Clarifies why we keep/drop/replace',
          replacement_symbol: null
        }
      ],
      final_watch_list: [
        {
          symbol: 'AAPL',
          economic_anchor: 'Macro linkage text',
          sentiment_pulse: 'Describe sentiment shift',
          olhcv_ready: true
        }
      ],
      reminder: 'This is a watch list recommendation, not financial advice.'
    },
    validate(payload) {
      const errors = [];
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        errors.push('Root payload must be a JSON object.');
        return errors;
      }
      if (payload.schema_name !== 'FineTuneDecisions') {
        errors.push('schema_name must equal "FineTuneDecisions".');
      }
      if (!Array.isArray(payload.actions) || payload.actions.length === 0) {
        errors.push('actions must be a non-empty array.');
      } else {
        payload.actions.forEach((action, index) => {
          if (!action || typeof action !== 'object') {
            errors.push(`actions[${index}] must be an object.`);
            return;
          }
          ['symbol', 'decision', 'reason'].forEach((key) => {
            if (typeof action[key] !== 'string' || !action[key].trim()) {
              errors.push(`actions[${index}].${key} must be a non-empty string.`);
            }
          });
          if (!['keep', 'drop', 'replace'].includes(action.decision)) {
            errors.push(`actions[${index}].decision must be keep/drop/replace.`);
          }
          if (action.decision === 'replace' && (typeof action.replacement_symbol !== 'string' || !action.replacement_symbol.trim())) {
            errors.push(`actions[${index}].replacement_symbol must be provided for replace decisions.`);
          }
        });
      }
      if (!Array.isArray(payload.final_watch_list) || payload.final_watch_list.length === 0) {
        errors.push('final_watch_list must be a non-empty array.');
      } else {
        payload.final_watch_list.forEach((entry, index) => {
          if (!entry || typeof entry !== 'object') {
            errors.push(`final_watch_list[${index}] must be an object.`);
            return;
          }
          ['symbol', 'economic_anchor', 'sentiment_pulse'].forEach((key) => {
            if (typeof entry[key] !== 'string' || !entry[key].trim()) {
              errors.push(`final_watch_list[${index}].${key} must be a non-empty string.`);
            }
          });
          if (typeof entry.olhcv_ready !== 'boolean') {
            errors.push(`final_watch_list[${index}].olhcv_ready must be boolean.`);
          }
        });
      }
      if (typeof payload.reminder !== 'string' || !payload.reminder.trim()) {
        errors.push('reminder must be a non-empty string.');
      }
      return errors;
    }
  }
};

class SchemaValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

function extractJsonPayload(output) {
  if (typeof output !== 'string') {
    throw new SchemaValidationError('Assistant output must be a string.');
  }
  const fencedMatch = output.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }
  const genericFence = output.match(/```([\s\S]*?)```/);
  if (genericFence) {
    return genericFence[1].trim();
  }
  const firstBrace = output.indexOf('{');
  const lastBrace = output.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return output.slice(firstBrace, lastBrace + 1).trim();
  }
  throw new SchemaValidationError('No JSON object found in assistant output.');
}

function validateAndParseStructuredOutput(schemaKey, output) {
  const schema = SCHEMAS[schemaKey];
  if (!schema) {
    throw new Error(`Unknown schema key: ${schemaKey}`);
  }
  const jsonPayload = extractJsonPayload(output);
  let parsed;
  try {
    parsed = JSON.parse(jsonPayload);
  } catch (error) {
    throw new SchemaValidationError(`Invalid JSON: ${error.message}`);
  }
  const errors = schema.validate(parsed);
  if (errors.length) {
    throw new SchemaValidationError(errors.join(' '));
  }
  return parsed;
}

function renderSchemaInstruction(schemaKey) {
  const schema = SCHEMAS[schemaKey];
  if (!schema) {
    return '';
  }
  const example = JSON.stringify(schema.example, null, 2);
  return `Return the result as a markdown fenced JSON block that strictly matches this schema:\n\n\`\`\`json\n${example}\n\`\`\``;
}

module.exports = {
  SCHEMAS,
  SchemaValidationError,
  validateAndParseStructuredOutput,
  renderSchemaInstruction
};
