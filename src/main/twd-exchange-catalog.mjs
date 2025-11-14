import { runExchangeCatalogIngestion } from '../twelve-data/exchange-catalog/index.mjs';

export async function ingestTwelveDataExchangeCatalog() {
    await runExchangeCatalogIngestion();
}
