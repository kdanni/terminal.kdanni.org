import {
    dbinstall,
    dbverify,
    timescaleMigrate,
    seedMysql,
    seedTimescale,
    seedAll,
    tdStockList,
    tdForexList,
    tdCommoditiesList,
    tdCryptocurrenciesList,
    tdEtfList,
    tdFixedIncomeList,
    tdFundList,
    pingRankingSignals,
    collectExchangeRankingSignalsCommand,
    twdAssetCatalog,
    twdExchangeCatalog,
    watchListSync,
    ohlcCollectDaily,
    ohlcCollectHourly
} from './commands.mjs';

const commandMap = new Map([
    [/^db[- ]?install\b/, dbinstall],
    [/^db[- ]?verify\b/, dbverify],
    [/^timescale(?::|[- ])?migrate\b/, timescaleMigrate],
    [/^seed(?::|[- ])?mysql\b/, seedMysql],
    [/^seed(?::|[- ])?timescale\b/, seedTimescale],
    [/^seed(?::|[- ])?all\b/, seedAll],
    [/^stock[- ]?list\b/, tdStockList],
    [/^forex[- ]?list\b/, tdForexList],
    [/^commodities[- ]?list\b/, tdCommoditiesList],
    [/^crypto(currencies)?[- ]?list\b/, tdCryptocurrenciesList],
    [/^etf[- ]?list\b/, tdEtfList],
    [/^fixed[- ]?income[- ]?list\b/, tdFixedIncomeList],
    [/^bond[- ]?list\b/, tdFixedIncomeList],
    [/^fund[- ]?list\b/, tdFundList],
    [/^ping[- ]?ranking\b/, pingRankingSignals],
    [/^ranking(?::|[- ])?collect(?::|[- ])?exchanges?\b/, collectExchangeRankingSignalsCommand],
    [/^twd(?::|[- ])?asset(?::|[- ])?catalogs?\b/, twdAssetCatalog],
    [/^twd(?::|[- ])?exchange(?::|[- ])?catalogs?\b/, twdExchangeCatalog],
    [/^watch(?::|[- ])?list(?::|[- ])?sync\b/, watchListSync],
    [/^ohlc(?::|[- ])?collect(?::|[- ])?daily\b/, ohlcCollectDaily],
    [/^ohlc(?::|[- ])?collect(?::|[- ])?(hourly|1h)\b/, ohlcCollectHourly]
]);

export default commandMap;