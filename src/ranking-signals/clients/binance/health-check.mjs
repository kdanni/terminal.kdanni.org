import { createHttpClient } from '../shared/http-client.mjs';
import { buildBinanceHeaders } from './api-key.mjs';

const BASE_URL = 'https://api.binance.com';
const HEALTH_ENDPOINT = 'api/v3/ping';

function createBinanceClient() {
    return createHttpClient({
        baseUrl: BASE_URL,
        headers: buildBinanceHeaders(),
        timeout: 5000
    });
}

export async function pingBinance({ signal } = {}) {
    const client = createBinanceClient();

    try {
        const response = await client.get(HEALTH_ENDPOINT, {
            responseType: 'json',
            signal
        });

        return {
            ok: response.statusCode === 200,
            service: 'binance',
            endpoint: `${BASE_URL}/${HEALTH_ENDPOINT}`,
            statusCode: response.statusCode,
            body: response.body
        };
    } catch (error) {
        throw new Error(`Binance ping request failed: ${error.message}`);
    }
}
