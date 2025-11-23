import { getCommoditiesList } from '../twelve-data/asset-catalogs/commodities-list.mjs';
import { getCryptocurrenciesList } from '../twelve-data/asset-catalogs/cryptocurrency-pairs.mjs';
import { getEtfList } from '../twelve-data/asset-catalogs/etf-list.mjs';
import { getFixedIncomeList } from '../twelve-data/asset-catalogs/fixedincome-list.mjs';
import { getForexPairsList } from '../twelve-data/asset-catalogs/forex-pairs-list.mjs';
import { getFundList } from '../twelve-data/asset-catalogs/fund-list.mjs';
import { getStockList } from '../twelve-data/asset-catalogs/stock-list.mjs';
import { getTwelveDataApiKey } from '../twelve-data/api-key.mjs';

const MINIMUM_DELAY_MS = 1000;
const DEFAULT_DELAY_MS = Number.parseInt(process.env.TWELVE_DATA_ASSET_DELAY_MS ?? '1500', 10);
const RATE_LIMIT_DELAY_MS = Number.isNaN(DEFAULT_DELAY_MS)
    ? MINIMUM_DELAY_MS
    : Math.max(DEFAULT_DELAY_MS, MINIMUM_DELAY_MS);

function delay(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

export async function ingestTwelveDataAssetCatalogs() {
    // Validate API key availability once before any network calls are made.
    getTwelveDataApiKey();

    const tasks = [
        { name: 'stock', action: getStockList },
        { name: 'forex pair', action: getForexPairsList },
        { name: 'commodity', action: getCommoditiesList },
        { name: 'cryptocurrency', action: getCryptocurrenciesList },
        { name: 'ETF', action: getEtfList },
        { name: 'fixed income', action: getFixedIncomeList },
        { name: 'fund', action: getFundList }
    ];

    for (let index = 0; index < tasks.length; index += 1) {
        const { name, action } = tasks[index];
        console.info(`[twelve-data] Starting ${name} asset catalog ingestion.`);

        await action();

        console.info(`[twelve-data] Completed ${name} asset catalog ingestion.`);

        const isLastTask = index === tasks.length - 1;
        if (!isLastTask && RATE_LIMIT_DELAY_MS > 0) {
            console.info(`[twelve-data] Waiting ${RATE_LIMIT_DELAY_MS}ms before the next ingestion task.`);
            await delay(RATE_LIMIT_DELAY_MS);
        }
    }
}
