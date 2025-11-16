const MODEL_ID = process.env.HF_MODEL_ID || 'HuggingFaceH4/zephyr-7b-beta';
const API_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;

function ensureFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  return (...args) => import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args));
}

const callFetch = ensureFetch();

function buildPrompt() {
  return `You are an institutional-grade research assistant.
Your task: deliver a concise WATCH LIST RECOMMENDATION (not financial advice) focused on the Magnificent Seven US equities (AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA).
The watch list must be grounded in:
- Economic relevance (market cap scale, average daily trading volume, index weights, sector/systemic footprints).
- Sentiment importance (long-term mention velocity, analyst tone, social virality trends).
- Connected macro assets: relevant USD or cross-border FX pairs, and the top-traded crypto majors tied to risk appetite.

Output format:
1. **Headline insight** highlighting why the group matters this week.
2. **Equity focus table** with each ticker, key economic metric, and a short sentiment pulse.
3. **Macro watch extensions** listing the supporting FX pairs and crypto assets plus the rationale for tracking them.
4. Close with a single reminder that this is a watch list recommendation and not financial advice.`;
}

async function requestWatchListRecommendation() {
  const token = process.env.HF_API_TOKEN;
  if (!token) {
    throw new Error('Missing HF_API_TOKEN environment variable. Create one at https://huggingface.co/settings/tokens');
  }

  const payload = {
    inputs: buildPrompt(),
    parameters: {
      max_new_tokens: 500,
      temperature: 0.35,
      top_p: 0.9,
      return_full_text: false
    }
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
  if (Array.isArray(data)) {
    return data.map((item) => item.generated_text || '').join('\n').trim();
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
