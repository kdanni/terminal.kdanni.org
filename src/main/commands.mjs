import { ingestTwelveDataAssetCatalogs } from './twd-asset-catalog.mjs';
import { ingestTwelveDataExchangeCatalog } from './twd-exchange-catalog.mjs';
import { collectDailyOhlc, collectHourlyOhlc } from './ohlc-collect.mjs';

export async function dbinstall() {
    const { runProdInstall } = await import('../db-install/db-install.mjs');
    await runProdInstall();
    setTimeout(async () => { process.emit('exit_event'); }, 1000);
}

export async function dbverify() {
    const { verifyProdIdempotency } = await import('../db-install/verify-idempotency.mjs');
    await verifyProdIdempotency();
    setTimeout(async () => { process.emit('exit_event'); }, 1000);
}

export async function timescaleMigrate() {
    const { runTimescaleMigrations } = await import('../postgres/timescale-migrate.mjs');
    await runTimescaleMigrations();
    setTimeout(async () => { process.emit('exit_event'); }, 1000);
}

export async function seedMysql(emitExit = true) {
    const { seedMysqlDatabase } = await import('../seeds/mysql-seed.mjs');
    await seedMysqlDatabase();
    if (emitExit) {
        setTimeout(async () => { process.emit('exit_event'); }, 1000);
    }
}

export async function seedTimescale(emitExit = true) {
    const { seedTimescaleDatabase } = await import('../seeds/timescale-seed.mjs');
    await seedTimescaleDatabase();
    if (emitExit) {
        setTimeout(async () => { process.emit('exit_event'); }, 1000);
    }
}

export async function seedAll() {
    await seedMysql(false);
    await seedTimescale(false);
    setTimeout(async () => { process.emit('exit_event'); }, 1000);
}

export async function main() {
    await import('../log/event-logger.mjs');
    const emitter = (await import('../event-emitter.mjs')).default;
    emitter.on('main', () => {/* NOP */ });

    await import('./main.mjs');
}

export async function tdStockList() {
    const { getStockList } = await import('../twelve-data/asset-catalogs/stock-list.mjs');
    await getStockList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

export async function tdForexList() {
    const { getForexPairsList } = await import('../twelve-data/asset-catalogs/forex-pairs-list.mjs');
    await getForexPairsList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

export async function tdCommoditiesList() {
    const { getCommoditiesList } = await import('../twelve-data/asset-catalogs/commodities-list.mjs');
    await getCommoditiesList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

export async function tdCryptocurrenciesList() {
    const { getCryptocurrenciesList } = await import('../twelve-data/asset-catalogs/cryptocurrency-pairs.mjs');
    await getCryptocurrenciesList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

export async function tdEtfList() {
    const { getEtfList } = await import('../twelve-data/asset-catalogs/etf-list.mjs');
    await getEtfList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

export async function tdFixedIncomeList() {
    const { getFixedIncomeList } = await import('../twelve-data/asset-catalogs/fixedincome-list.mjs');
    await getFixedIncomeList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

export async function tdFundList() {
    const { getFundList } = await import('../twelve-data/asset-catalogs/found-list.mjs');
    await getFundList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

export async function twdAssetCatalog() {
    await ingestTwelveDataAssetCatalogs();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

export async function twdExchangeCatalog() {
    await ingestTwelveDataExchangeCatalog();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

export async function watchListSync() {
    const { syncWatchLists } = await import('../watch-list/sync.mjs');
    await syncWatchLists();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

export async function ohlcCollectDaily() {
    await collectDailyOhlc();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

export async function ohlcCollectHourly() {
    await collectHourlyOhlc();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}


export async function pingRankingSignals(params) {
    const { clients } = await import('../ranking-signals/index.mjs');

    await clients.pingBinance();
    await clients.pingCoinGecko();
    await clients.pingCoinMarketCap();
    // await clients.pingKaiko();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

export async function collectExchangeRankingSignalsCommand() {
    const { collectExchangeRankingSignals } = await import('../ranking-signals/index.mjs');

    await collectExchangeRankingSignals();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}