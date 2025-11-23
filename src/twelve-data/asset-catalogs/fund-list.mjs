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

    try {
        const stream = chain([
            got.stream(requestUrl),
            parser(),
            pick({ filter: 'result.list' }),
            streamArray()
        ]);

        // {
        //     "result": {
        //         "count": 84799,
        //         "list": [
        //             {
        //                 "symbol": "DIVI",
        //                 "name": "AdvisorShares Athena High Dividend ETF",
        //                 "country": "United States",
        //                 "currency": "USD",
        //                 "exchange": "NYSE",
        //                 "mic_code": "ARCX",
        //                 "type": "ETF",
        //                 "figi_code": "BBG00161BCW4",
        //                 "cfi_code": "CECILU",
        //                 "isin": "GB00B65TLW28",
        //                 "cusip": "35473P108",
        //                 "access": {
        //                     "global": "Basic",
        //                     "plan": "Basic"
        //                 }
        //             }
        //         ]
        //     },
        //     "status": "ok"
        // }

        for await (const { value: fund } of stream) {
            // console.dir(fund);
            fundList.push({
                symbol: fund.symbol,
                name: fund.name,
                country: fund.country,
                currency: fund.currency,
                exchange: fund.exchange,
                mic_code: fund.mic_code,
                type: fund.type,
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
        for await (const fund of fundList) {
    
            // CREATE PROCEDURE upsert_fund (
            //     IN p_symbol VARCHAR(10),
            //     IN p_name VARCHAR(512),
            //     IN p_country VARCHAR(50),
            //     IN p_currency VARCHAR(10),
            //     IN p_exchange VARCHAR(50),
            //     IN p_mic_code VARCHAR(10),
            //     IN p_type VARCHAR(50),
            //     IN p_figi_code VARCHAR(12),
            //     IN p_cfi_code VARCHAR(6),
            //     IN p_isin VARCHAR(255),
            //     IN p_cusip VARCHAR(255),
            //     IN p_access_global VARCHAR(20),
            //     IN p_access_plan VARCHAR(20)
            // )

            try {
                await connection.query('CALL upsert_fund(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                    fund.symbol || null,
                    fund.name || fund.symbol || null,
                    fund.country || 'unknown',
                    fund.currency || 'unknown',
                    fund.exchange || 'unknown',
                    fund.mic_code || 'unknown',
                    fund.type || 'unknown',
                    fund.figi_code || 'unknown',
                    fund.cfi_code || 'unknown',
                    fund.isin || 'unknown',
                    fund.cusip || 'unknown',
                    fund.access_global || 'unknown',
                    fund.access_plan || 'unknown'
                ]);
            } catch (errr) {
                console.warn('[Fund upsert fail]', errr);
            }
        }
    } finally {
        connection.release();
    }
}