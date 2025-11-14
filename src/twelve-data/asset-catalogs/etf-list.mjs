import got from 'got';
import { pool } from '../../mysql/mysql2-env-connection.mjs';
import { withTwelveDataApiKey } from '../api-key.mjs';


export async function getEtfList() {
    const requestUrl = withTwelveDataApiKey('https://api.twelvedata.com/etfs', { source: 'docs' });
    const response = await got(requestUrl);

    let jsonData;

        // {
        //     "symbol": "SPY",
        //     "name": "SPDR S&P 500 ETF Trust",
        //     "currency": "USD",
        //     "exchange": "NYSE",
        //     "mic_code": "ARCX",
        //     "country": "United States",
        //     "figi_code": "BBG000BDTF76",
        //     "cfi_code": "CECILU",
        //     "isin": "US78462F1030",
        //     "cusip": "037833100",
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

    // CREATE PROCEDURE upsert_etf(
    // IN p_symbol VARCHAR(10),
    // IN p_name VARCHAR(255),
    // IN p_currency VARCHAR(10),
    // IN p_exchange VARCHAR(50),
    // IN p_mic_code VARCHAR(10),
    // IN p_country VARCHAR(50),
    // IN p_figi_code VARCHAR(12),
    // IN p_cfi_code VARCHAR(6),
    // IN p_isin VARCHAR(12),
    // IN p_cusip VARCHAR(9),
    // IN p_access_global VARCHAR(20),
    // IN p_access_plan VARCHAR(20)
    // )

    const etfList = jsonData.data.map(etf => ({
        symbol : etf.symbol,
        name : etf.name,
        currency : etf.currency,
        exchange : etf.exchange,
        mic_code : etf.mic_code,
        country : etf.country,
        figi_code : etf.figi_code,
        cfi_code : etf.cfi_code,
        isin : etf.isin,
        cusip : etf.cusip,
        access_global : etf.access?.global,
        access_plan : etf.access?.plan
    }));

    const connection = await pool.getConnection();
    try {
        for (const etf of etfList) {
            await connection.query('CALL upsert_etf(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                etf.symbol || null,
                etf.name || null,
                etf.currency || null,
                etf.exchange || null,
                etf.mic_code || null,
                etf.country || null,
                etf.figi_code || null,
                etf.cfi_code || null,
                etf.isin || null,
                etf.cusip || null,
                etf.access_global || null,
                etf.access_plan || null
            ]);
        }
    } finally {
        connection.release();
    }
}