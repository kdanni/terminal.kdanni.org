import { readEnvString } from '../shared/env.mjs';

const ENV_VAR_NAME = 'COINGECKO_API_KEY';

export function getCoinGeckoApiKey() {
    return readEnvString(ENV_VAR_NAME);
}

export function buildCoinGeckoHeaders() {
    const apiKey = getCoinGeckoApiKey();

    if (!apiKey) {
        return {};
    }

    return {
        'x-cg-pro-api-key': apiKey
    };
}
