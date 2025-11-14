import { readEnvString } from '../shared/env.mjs';

const ENV_VAR_NAME = 'BINANCE_API_KEY';

export function getBinanceApiKey() {
    return readEnvString(ENV_VAR_NAME);
}

export function buildBinanceHeaders() {
    const apiKey = getBinanceApiKey();

    if (!apiKey) {
        return {};
    }

    return {
        'X-MBX-APIKEY': apiKey
    };
}
