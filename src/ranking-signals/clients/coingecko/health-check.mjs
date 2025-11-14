import { createHttpClient } from '../shared/http-client.mjs';
import { buildCoinGeckoHeaders } from './api-key.mjs';

const BASE_URL = 'https://api.coingecko.com/api/v3';
const HEALTH_ENDPOINT = 'ping';

function createCoinGeckoClient() {
    return createHttpClient({
        baseUrl: BASE_URL,
        headers: buildCoinGeckoHeaders(),
        timeout: 5000
    });
}

export async function pingCoinGecko({ signal } = {}) {
    const client = createCoinGeckoClient();

    try {
        const response = await client.get(HEALTH_ENDPOINT, {
            responseType: 'json',
            signal
        });

        return {
            ok: response.statusCode === 200,
            service: 'coingecko',
            endpoint: `${BASE_URL}/${HEALTH_ENDPOINT}`,
            statusCode: response.statusCode,
            body: response.body
        };
    } catch (error) {
        throw new Error(`CoinGecko ping request failed: ${error.message}`);
    }
}
