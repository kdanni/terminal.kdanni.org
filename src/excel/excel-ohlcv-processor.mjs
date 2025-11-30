import { db } from '../postgres/pgPromise-env-connection.mjs';
import { upsertOhlcvRow } from '../postgres/ohlcv-data.mjs';
import { createAssetWatchListEntry, getAssetWatchListEntryBySymbol } from '../postgres/asset-watch-list.mjs';


const OHLCV_EXCEL_DATA_TABLE = 'ohlcv_ecel_data'

export async function excelOhlcvProcessor() {
    console.info('[excel ohlcv processor] Starting processing...');

    const assetList = [];
    const assetDictionary = {};

    const selectDistincParams = { };
    const selectDistincSQL = `SELECT DISTINCT symbol FROM ${OHLCV_EXCEL_DATA_TABLE}`;

    const selectDistincResult = await db.query(selectDistincSQL, selectDistincParams);

    // console.dir(selectDistincResult);

    for( const symbol of selectDistincResult) {
        if(symbol?.symbol) {
            assetList.push(`${symbol.symbol}`);
            assetDictionary[`${symbol.symbol}`] = { excelSymbol : `${symbol.symbol}` };
        }
    }


    const exchangeSQL = 'SELECT name FROM exchanges_catalog WHERE code = $[code] LIMIT 1';

    for(const asset of assetList) {
        if(/^[^:]+:[^:]+$/.test(asset)){
            // exhange:ticker

            const ids = /^([^:]+):([^:]+)$/.exec(asset) || ['',''];
            const param = { code : ids[1] };
            const exchange = await db.query(exchangeSQL, param);
            // console.log(asset, ids[1], exchange, ids[2]);
            let name = 'unknown';
            if(exchange[0] && exchange[0]?.name) {
                name = `${exchange[0].name}`;
            } else {
                name = ids[1];
            }

            assetDictionary[asset].exchange = {name: name, code: `${ids[1]}`};
            assetDictionary[asset].ticker = `${ids[2]}`;

        } else {
            // currency or crypto
        }
    }

    // console.dir(assetDictionary);


    const selectOhlcvSql = `SELECT * FROM ${OHLCV_EXCEL_DATA_TABLE} WHERE symbol = $[symbol]`;


    for(const asset of assetList) {
        const param = { symbol : `${asset}`};
        const ohlcvResult = await db.query(selectOhlcvSql, param);
 
        const wl = {
            symbol: `${assetDictionary[asset].ticker}`, 
            exchange: `${assetDictionary[asset].exchange.name}`, 
            active: true
        }

        const wlAss = await getAssetWatchListEntryBySymbol(wl);
        if(!wlAss || wlAss?.length < 1) {
            await createAssetWatchListEntry(wl);
        }

        for (const row of ohlcvResult) {
            const symbol = `${assetDictionary[asset].ticker}`;
            const exchange = `${assetDictionary[asset].exchange.name}`;
            const interval = '1d';
            const time1 = row.time;  // GMT+1
            const date = new Date(time1);
            date.setHours(date.getHours() + 1);
            const time2 = new Date(date); // GMT+2
            
            // console.log(symbol, exchange, interval, time1, time2, row.open, row.high, row.low, row.close, row.volume);
            
            await upsertOhlcvRow({
                symbol, 
                exchange, 
                interval, 
                time: time2.getTime(),
                open: row.open, 
                high: row.high, 
                low: row.low, 
                close: row.close, 
                volume: row.volume
            });

        }

        console.log('Excel OHLCV -> OHLCV', wl.symbol, wl.exchange, `row count: ${ohlcvResult?.length}`);
    }
}