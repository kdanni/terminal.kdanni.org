import { createHttpClient } from '../shared/http-client.mjs';
import { buildKaikoHeaders } from './api-key.mjs';

const BASE_URL = 'https://us.market-api.kaiko.io';
const HEALTH_ENDPOINT = 'v2/reference-data/aggregations/exchanges';

function createKaikoClient() {
    return createHttpClient({
        baseUrl: BASE_URL,
        headers: {
            ...buildKaikoHeaders(),
            Accept: 'application/json'
        },
        timeout: 10000
    });
}

export async function pingKaiko({ signal } = {}) {
    const client = createKaikoClient();

    try {
        const response = await client.get(HEALTH_ENDPOINT, {
            searchParams: {
                page_size: 1
            },
            responseType: 'json',
            signal
        });

        const body = response.body;
        const ok = response.statusCode === 200 && Array.isArray(body?.data);

        return {
            ok,
            service: 'kaiko',
            endpoint: `${BASE_URL}/${HEALTH_ENDPOINT}`,
            statusCode: response.statusCode,
            body
        };
    } catch (error) {
        throw new Error(`Kaiko ping request failed: ${error.message}`);
    }
}
