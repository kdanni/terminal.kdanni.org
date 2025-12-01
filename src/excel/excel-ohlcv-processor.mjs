import { db } from '../postgres/pgPromise-env-connection.mjs';
import { upsertOhlcvRow } from '../postgres/ohlcv-data.mjs';
import { createAssetWatchListEntry, getAssetWatchListEntryBySymbol, upsertExcelWatchListEntry } from '../postgres/asset-watch-list.mjs';


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
            assetDictionary[asset].exchange = {name: '#N/A', code: '#N/A'};
            assetDictionary[asset].ticker = `${asset}`;
        }
    }

    // console.dir(assetDictionary);

    const timeField = "time AT TIME ZONE 'UTC' AS timeutc, time AT TIME ZONE 'Europe/Budapest' AS timecet";
    const fieldList = `time, ${timeField}, open, high, low, close, volume`;
    const selectOhlcvSql = `SELECT ${fieldList} FROM ${OHLCV_EXCEL_DATA_TABLE} WHERE symbol = $[symbol]`;


    for(const asset of assetList) {
        const param = { symbol : `${asset}`};
        const ohlcvResult = await db.query(selectOhlcvSql, param);
 
        const wl = {
            symbol: `${assetDictionary[asset].ticker}`, 
            exchange: `${assetDictionary[asset].exchange.name}`, 
            excel_symbol: `${asset}`,
            active: true
        }

        const wlAss = await getAssetWatchListEntryBySymbol(wl);
        if(!wlAss || wlAss?.length < 1) {
            await createAssetWatchListEntry(wl);
        }

        await upsertExcelWatchListEntry(wl);

        for (const row of ohlcvResult) {
            const symbol = `${assetDictionary[asset].ticker}`;
            const exchange = `${assetDictionary[asset].exchange.name}`;
            const interval = '1d';
            // const time = row.time;  // local
            // const timeUtc = row.timeutc; // UTF
            // const timeCet = row.timecet; // CET
            const converted = convertToTimeZone(row.timeutc);
 
            // console.log(time, timeUtc, timeCet, converted);
            // console.log(`${time}`,`${timeUtc}`, `${timeCet}`, `${converted}`);
            // console.log(`${time.toISOString()}`,`${timeUtc.toISOString()}`, `${timeCet.toISOString()}`, `${converted.toISOString()}`);

            // console.log(symbol, exchange, interval, converted, row.open, row.high, row.low, row.close, row.volume);
            
            await upsertOhlcvRow({
                symbol, 
                exchange, 
                interval, 
                time: converted,
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

function convertToTimeZone(date) {
    date.setHours(date.getHours() + 6);
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: 'UTC',
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    const get = type => parts.find(p => p.type === type).value;
    return new Date(
        `${get("year")}-${get("month")}-${get("day")}T${'00'}:${'00'}:${'00'}Z`
    );
}