import got from 'got';

// CommonJS modules can always be imported via the default export:
import sch from 'stream-chain';
const { chain } = sch;
import sj from 'stream-json';
const { parser } = sj;
import sjPick from 'stream-json/filters/Pick.js';
const { pick } = sjPick;
import sjArray from 'stream-json/streamers/StreamArray.js';
const { streamArray } = sjArray;

import { pool } from '../../mysql/mysql2-env-connection.mjs';
import { withTwelveDataApiKey } from '../api-key.mjs';


export async function getFundList() {
    const requestUrl = withTwelveDataApiKey('https://api.twelvedata.com/funds', { source: 'docs' });
    const fundList = [];

    // {
    //     "symbol": "DIVI",
    //     "name": "AdvisorShares Athena High Dividend ETF",
    //     "country": "United States",
    //     "currency": "USD",
    //     "exchange": "NYSE",
    //     "mic_code": "ARCX",
    //     "type": "ETF",
    //     "figi_code": "BBG00161BCW4",
    //     "cfi_code": "CECILU",
    //     "isin": "GB00B65TLW28",
    //     "cusip": "35473P108",
    //     "access": {
    //         "global": "Basic",
    //         "plan": "Basic"
    //     }
    // }

    try {
        const stream = chain([
            got.stream(requestUrl),
            parser(),
            pick({ filter: 'result.list' }),
            streamArray()
        ]);

        for await (const { value: fund } of stream) {
            fundList.push({
                symbol: fund.symbol,
                name: fund.name,
                currency: fund.currency,
                exchange: fund.exchange,
                mic_code: fund.mic_code,
                country: fund.country,
                figi_code: fund.figi_code,
                cfi_code: fund.cfi_code,
                isin: fund.isin,
                cusip: fund.cusip,
                access_global: fund.access?.global,
                access_plan: fund.access?.plan
            });
        }
    } catch (error) {
        console.error('Error streaming JSON data:', error);
        return;
    }

    const connection = await pool.getConnection();
    try {
        for (const fund of fundList) {
            await connection.query('CALL upsert_etf(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                fund.symbol || null,
                fund.name || null,
                fund.currency || null,
                fund.exchange || null,
                fund.mic_code || null,
                fund.country || null,
                fund.figi_code || null,
                fund.cfi_code || null,
                fund.isin || null,
                fund.cusip || null,
                fund.access_global || null,
                fund.access_plan || null
            ]);
        }
    } finally {
        connection.release();
    }
}