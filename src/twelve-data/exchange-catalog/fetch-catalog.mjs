import got from 'got';
import { withTwelveDataApiKey } from '../api-key.mjs';

function normalizeString(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function mapExchange(raw) {
    const code = normalizeString(raw.code);
    const name = normalizeString(raw.name);

    if (!code || !name) {
        throw new Error('Exchange entry is missing required code or name fields.');
    }

    return {
        code,
        name,
        country: normalizeString(raw.country),
        city: normalizeString(raw.city),
        timezone: normalizeString(raw.timezone) ?? normalizeString(raw.timezone_name),
        currency: normalizeString(raw.currency),
        mic_code: normalizeString(raw.mic_code),
        acronym: normalizeString(raw.acronym),
        website: normalizeString(raw.website),
        phone: normalizeString(raw.phone),
        address: normalizeString(raw.address)
    };
}

export async function fetchExchangeCatalog() {
    const requestUrl = withTwelveDataApiKey('https://api.twelvedata.com/exchanges', { source: 'docs' });
    const response = await got(requestUrl, {
        timeout: {
            request: 15000
        }
    });

    let payload;
    try {
        payload = JSON.parse(response.body);
    } catch (error) {
        throw new Error(`Unable to parse Twelve Data exchange catalog response: ${error.message}`);
    }

    if (!payload || !Array.isArray(payload.data)) {
        throw new Error('Twelve Data exchange catalog response did not include a data array.');
    }

    const exchanges = [];
    for (const raw of payload.data) {
        try {
            exchanges.push(mapExchange(raw));
        } catch (error) {
            console.warn('[twelve-data] Skipping exchange entry due to validation error:', error.message);
        }
    }

    return {
        exchanges,
        metadata: {
            total: payload.data.length,
            accepted: exchanges.length
        }
    };
}
