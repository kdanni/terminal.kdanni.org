const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MODEL_ID = process.env.HF_MODEL_ID || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B';
const API_BASE_URL = (process.env.HF_API_BASE_URL || 'https://router.huggingface.co/v1').replace(/\/$/, '');
const API_URL = `${API_BASE_URL}/chat/completions`;

function ensureFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  return (...args) => import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args));
}

const DEFAULT_SYSTEM_PROMPT =
  'You are an institutional-grade research assistant who produces macro-aware watch list recommendations with disciplined risk disclaimers.';

const TOKEN_ERROR =
  'Missing HF_API_KEY (or HF_API_TOKEN) environment variable. Create one at https://huggingface.co/settings/tokens';

function renderTemplate(template = '', context = {}) {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const value = context[key];
    return value == null ? '' : String(value);
  });
}

class ConversationOrchestrator {
  constructor(options = {}) {
    this.fetch = ensureFetch();
    this.apiUrl = options.apiUrl || API_URL;
    this.model = options.model || MODEL_ID;
    this.defaultTemperature = options.temperature ?? 0.35;
    this.defaultMaxTokens = options.maxTokens ?? 600;
    this.logger = options.logger || console;
    this.apiKey = options.apiKey || process.env.HF_API_KEY || process.env.HF_API_TOKEN;

    if (!this.apiKey) {
      throw new Error(TOKEN_ERROR);
    }

    this.messages = [
      {
        role: 'system',
        content: options.systemPrompt || DEFAULT_SYSTEM_PROMPT
      }
    ];
  }

  async fetchLLM(messages, overrides = {}) {
    const payload = {
      model: this.model,
      messages,
      temperature: this.defaultTemperature,
      max_tokens: this.defaultMaxTokens,
      top_p: 0.9,
      ...overrides
    };

    const response = await this.fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Hugging Face request failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    if (data?.error) {
      const details = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      throw new Error(`Hugging Face router error: ${details}`);
    }

    const message = data?.choices?.[0]?.message?.content;
    if (!message) {
      throw new Error('Missing message content in Hugging Face response');
    }

    return message.trim();
  }

  logPhaseHeader(phase, attempt) {
    const tag = phase.logTag || phase.name;
    this.logger.info(`\n[${tag}] Running (attempt ${attempt + 1})...`);
  }

  async runPhase(phase, context = {}) {
    if (!phase || !phase.promptTemplate) {
      throw new Error('Invalid phase configuration: promptTemplate is required');
    }

    const compiledPrompt = renderTemplate(phase.promptTemplate, {
      ...context,
      phaseName: phase.name
    }).trim();

    const userMessage = {
      role: phase.role || 'user',
      content: compiledPrompt
    };

    const maxRetries = Math.max(0, phase.maxRetries ?? 0);
    let temperature = phase.temperature ?? this.defaultTemperature;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      this.logPhaseHeader(phase, attempt);
      this.logger.info(compiledPrompt);

      try {
        const assistantMessage = await this.fetchLLM([...this.messages, userMessage], {
          temperature,
          max_tokens: phase.maxTokens ?? this.defaultMaxTokens,
          top_p: phase.top_p ?? 0.9
        });

        this.messages.push(userMessage);
        this.messages.push({ role: 'assistant', content: assistantMessage });

        this.logger.info(`[${phase.name}] assistant output:\n${assistantMessage}`);

        return {
          output: assistantMessage,
          attempt: attempt + 1
        };
      } catch (error) {
        this.logger.warn(`[${phase.name}] attempt ${attempt + 1} failed: ${error.message}`);
        if (attempt === maxRetries) {
          throw error;
        }
        const step = phase.temperatureStep ?? 0.1;
        temperature = Math.min(1, temperature + step);
        this.logger.warn(`[${phase.name}] retrying with adjusted temperature=${temperature.toFixed(2)}`);
      }
    }

    throw new Error(`Phase ${phase.name} exhausted retries without a response`);
  }

  isConverged(output, convergenceConfig) {
    if (!output || !convergenceConfig) {
      return false;
    }

    if (convergenceConfig.regex) {
      const regex = new RegExp(convergenceConfig.regex, convergenceConfig.regexFlags || 'i');
      if (!regex.test(output)) {
        return false;
      }
    }

    if (convergenceConfig.keywords) {
      const normalized = output.toLowerCase();
      const satisfied = convergenceConfig.keywords.every((keyword) => normalized.includes(keyword.toLowerCase()));
      if (!satisfied) {
        return false;
      }
    }

    if (typeof convergenceConfig.customCheck === 'function') {
      return Boolean(convergenceConfig.customCheck(output));
    }

    return true;
  }
}

module.exports = {
  ConversationOrchestrator,
  renderTemplate
};

