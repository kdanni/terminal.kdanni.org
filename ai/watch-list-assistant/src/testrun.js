const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_BASE_URL = (process.env.HF_API_BASE_URL || 'https://router.huggingface.co/v1').replace(/\/$/, '');
const API_URL = `${API_BASE_URL}/chat/completions`;
const MODEL_ID = process.env.HF_MODEL_ID || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B';
const API_KEY = process.env.HF_API_KEY || process.env.HF_API_TOKEN;

if (!API_KEY) {
  console.error('Missing HF_API_KEY (or HF_API_TOKEN) environment variable.');
  process.exit(1);
}

async function runMinimalRequest() {
  const messages = [
    {
      role: 'system',
      content: 'You are a sanity-check assistant. Answer concisely.'
    },
    {
      role: 'user',
      content: 'Reply with a short confirmation string and no JSON formatting.'
    }
  ];

  const payload = { model: MODEL_ID, messages };
  const payloadJson = JSON.stringify(payload, null, 2);

  try {
    JSON.parse(payloadJson);
  } catch (error) {
    console.error('Payload failed to serialize:', error.message);
    process.exit(1);
  }

  console.log('[Testrun] Endpoint:', API_URL);
  console.log('[Testrun] Headers: { "Content-Type": "application/json" }');
  console.log('[Testrun] Payload JSON:\n', payloadJson);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: payloadJson
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`[Testrun] Request failed (${response.status}):`, text);
    process.exit(1);
  }

  console.log('[Testrun] Raw response:', text);
}

runMinimalRequest().catch((error) => {
  console.error('[Testrun] Unexpected error:', error.message);
  process.exitCode = 1;
});
