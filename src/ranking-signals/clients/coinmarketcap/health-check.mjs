import { createHttpClient } from '../shared/http-client.mjs';
import { buildCoinMarketCapHeaders } from './api-key.mjs';

const BASE_URL = 'https://pro-api.coinmarketcap.com';
const HEALTH_ENDPOINT = 'v1/key/info';

function createCoinMarketCapClient() {
    return createHttpClient({
        baseUrl: BASE_URL,
        headers: {
            ...buildCoinMarketCapHeaders(),
            Accept: 'application/json'
        },
        timeout: 7000
    });
}

export async function pingCoinMarketCap({ signal } = {}) {
    const client = createCoinMarketCapClient();

    try {
        const response = await client.get(HEALTH_ENDPOINT, {
            responseType: 'json',
            signal
        });

        const body = response.body;
        const status = body?.status;
        const ok = response.statusCode === 200 && status?.error_code === 0;

        return {
            ok,
            service: 'coinmarketcap',
            endpoint: `${BASE_URL}/${HEALTH_ENDPOINT}`,
            statusCode: response.statusCode,
            body
        };
    } catch (error) {
        throw new Error(`CoinMarketCap ping request failed: ${error.message}`);
    }
}
