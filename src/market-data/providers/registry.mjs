import { createAlphaVantageProvider } from './alpha-vantage.mjs';
import { createFinnhubProvider } from './finnhub.mjs';
import { createTwelveDataProvider } from './twelve-data.mjs';

const providers = [
    createTwelveDataProvider(),
    createFinnhubProvider(),
    createAlphaVantageProvider(),
];

export function getOhlcProviders() {
    return providers;
}
