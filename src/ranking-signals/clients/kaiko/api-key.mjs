import { requireEnvString } from '../shared/env.mjs';

const ENV_VAR_NAME = 'KAIKO_API_KEY';

export function getKaikoApiKey() {
    return requireEnvString(
        ENV_VAR_NAME,
        'Missing Kaiko API key. Please set the KAIKO_API_KEY environment variable.'
    );
}

export function buildKaikoHeaders() {
    return {
        'X-Api-Key': getKaikoApiKey()
    };
}
