import { URL } from 'node:url';
let cachedApiKey;

function normalizeKey(rawValue) {
    if (!rawValue || !rawValue.trim()) {
        throw new Error('Missing Alpha Vantage API key. Set the ALPHA_VANTAGE_API_KEY environment variable.');
    }

    const normalized = rawValue.trim();

    if (normalized.toLowerCase() === 'demo') {
        throw new Error('The Alpha Vantage demo key is not supported. Provide a production ALPHA_VANTAGE_API_KEY.');
    }

    return normalized;
}

export function getAlphaVantageApiKey() {
    if (cachedApiKey) {
        return cachedApiKey;
    }

    cachedApiKey = normalizeKey(process.env.ALPHA_VANTAGE_API_KEY);
    return cachedApiKey;
}

export function withAlphaVantageApiKey(url, additionalParams = {}) {
    const requestUrl = new URL(url);
    requestUrl.searchParams.set('apikey', getAlphaVantageApiKey());

    for (const [name, value] of Object.entries(additionalParams)) {
        if (value === undefined || value === null) {
            continue;
        }

        requestUrl.searchParams.set(name, String(value));
    }

    return requestUrl.toString();
}
