import { URL } from 'node:url';
let cachedApiKey;

function normalizeKey(rawValue) {
    if (!rawValue || !rawValue.trim()) {
        throw new Error('Missing Finnhub API key. Set the FINNHUB_API_KEY environment variable.');
    }

    return rawValue.trim();
}

export function getFinnhubApiKey() {
    if (cachedApiKey) {
        return cachedApiKey;
    }

    cachedApiKey = normalizeKey(process.env.FINNHUB_API_KEY);
    return cachedApiKey;
}

export function withFinnhubApiKey(url, additionalParams = {}) {
    const requestUrl = new URL(url);
    requestUrl.searchParams.set('token', getFinnhubApiKey());

    for (const [name, value] of Object.entries(additionalParams)) {
        if (value === undefined || value === null) {
            continue;
        }

        requestUrl.searchParams.set(name, String(value));
    }

    return requestUrl.toString();
}
