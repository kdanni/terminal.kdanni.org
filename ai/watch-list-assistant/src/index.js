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

const callFetch = ensureFetch();

function buildPrompt() {
  return `Deliver a concise WATCH LIST RECOMMENDATION (not financial advice) focused on the Magnificent Seven US equities (AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA).
Ground the recommendation in:
- Economic relevance (market cap scale, average daily trading volume, index weights, sector/systemic footprints).
- Sentiment importance (long-term mention velocity, analyst tone, social virality trends).
- Connected macro assets: relevant USD or cross-border FX pairs, and the top-traded crypto majors tied to risk appetite.

Output format:
1. **Headline insight** highlighting why the group matters this week.
2. **Equity focus table** with each ticker, key economic metric, and a short sentiment pulse.
3. **Macro watch extensions** listing the supporting FX pairs and crypto assets plus the rationale for tracking them.
4. Close with a single reminder that this is a watch list recommendation and not financial advice.`;
}

function buildMessages() {
  return [
    {
      role: 'system',
      content:
        'You are an institutional-grade research assistant who produces macro-aware watch list recommendations with disciplined risk disclaimers.'
    },
    { role: 'user', content: buildPrompt() }
  ];
}

async function requestWatchListRecommendation() {
  const token = process.env.HF_API_KEY || process.env.HF_API_TOKEN;
  if (!token) {
    throw new Error('Missing HF_API_KEY (or HF_API_TOKEN) environment variable. Create one at https://huggingface.co/settings/tokens');
  }

  const payload = {
    model: MODEL_ID,
    messages: buildMessages(),
    max_tokens: 600,
    temperature: 0.35,
    top_p: 0.9
  };

  const response = await callFetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
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
    throw new Error(`Hugging Face router error: ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`);
  }

  const message = data?.choices?.[0]?.message?.content;
  if (message) {
    return message.trim();
  }

  return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

(async () => {
  try {
    const recommendation = await requestWatchListRecommendation();
    console.log('\n=== Watch List Recommendation ===\n');
    console.log(recommendation);
    console.log('\nReminder: This is a watch list recommendation, not financial advice.');
  } catch (error) {
    console.error('Failed to fetch watch list recommendation:', error.message);
    process.exitCode = 1;
  }
})();
