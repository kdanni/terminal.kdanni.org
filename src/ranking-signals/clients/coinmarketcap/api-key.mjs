import { requireEnvString } from '../shared/env.mjs';

const ENV_VAR_NAME = 'COINMARKETCAP_API_KEY';

export function getCoinMarketCapApiKey() {
    return requireEnvString(
        ENV_VAR_NAME,
        'Missing CoinMarketCap API key. Please set the COINMARKETCAP_API_KEY environment variable.'
    );
}

export function buildCoinMarketCapHeaders() {
    return {
        'X-CMC_PRO_API_KEY': getCoinMarketCapApiKey()
    };
}
