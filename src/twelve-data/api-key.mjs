import { URL } from 'node:url';

let cachedApiKey;

function loadApiKey() {
    const rawValue = process.env.TWELVE_DATA_API_KEY;

    if (!rawValue || !rawValue.trim()) {
        throw new Error('Missing Twelve Data API key. Please set the TWELVE_DATA_API_KEY environment variable.');
    }

    const normalizedValue = rawValue.trim();

    if (normalizedValue.toLowerCase() === 'demo') {
        throw new Error('Invalid Twelve Data API key. Replace the demo key with a production TWELVE_DATA_API_KEY value.');
    }

    cachedApiKey = normalizedValue;
    return cachedApiKey;
}

export function getTwelveDataApiKey() {
    if (cachedApiKey) {
        return cachedApiKey;
    }

    return loadApiKey();
}

export function withTwelveDataApiKey(url, additionalParams = {}) {
    const requestUrl = new URL(url);
    requestUrl.searchParams.set('apikey', getTwelveDataApiKey());

    for (const [name, value] of Object.entries(additionalParams)) {
        if (value === undefined || value === null) {
            continue;
        }

        requestUrl.searchParams.set(name, String(value));
    }

    return requestUrl.toString();
}
