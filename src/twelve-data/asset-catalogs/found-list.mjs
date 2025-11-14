import got from 'got';
import { pool } from '../../mysql/mysql2-env-connection.mjs';
import { withTwelveDataApiKey } from '../api-key.mjs';


export async function getFundList() {
    const requestUrl = withTwelveDataApiKey('https://api.twelvedata.com/funds', { source: 'docs' });
    const response = await got(requestUrl);

    let jsonData;

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
        jsonData = JSON.parse(response.body);
    } catch (error) {
        console.error('Error parsing JSON data:', error);
        return;
    }

    // CREATE PROCEDURE upsert_fund (
    //     IN p_symbol VARCHAR(10),
    //     IN p_name VARCHAR(100),
    //     IN p_country VARCHAR(50),
    //     IN p_currency VARCHAR(10),
    //     IN p_exchange VARCHAR(50),
    //     IN p_mic_code VARCHAR(10),
    //     IN p_type VARCHAR(50),
    //     IN p_figi_code VARCHAR(12),
    //     IN p_cfi_code VARCHAR(6),
    //     IN p_isin VARCHAR(12),
    //     IN p_cusip VARCHAR(9),
    //     IN p_access_global VARCHAR(20),
    //     IN p_access_plan VARCHAR(20)
    // )

    const fundList = jsonData.result.list.map(fund => ({
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
    }));

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