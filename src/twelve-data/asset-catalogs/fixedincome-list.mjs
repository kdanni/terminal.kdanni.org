import got from 'got';
import { pool } from '../../mysql/mysql2-env-connection.mjs';
import { withTwelveDataApiKey } from '../api-key.mjs';

export async function getFixedIncomeList() {
    const requestUrl = withTwelveDataApiKey('https://api.twelvedata.com/bonds');
    const response = await got(requestUrl);

    let jsonData;

            // {
            //     "symbol": "US2Y",
            //     "name": "US Treasury Yield 2 Years",
            //     "country": "United States",
            //     "currency": "USD",
            //     "exchange": "NYSE",
            //     "mic_code": "XNYS",
            //     "type": "Bond",
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

//     CREATE PROCEDURE upsert_fixed_income(
//     IN p_symbol VARCHAR(16),
//     IN p_name VARCHAR(255),
//     IN p_country VARCHAR(100),
//     IN p_currency VARCHAR(10),
//     IN p_exchange VARCHAR(50),
//     IN p_mic_code VARCHAR(10),
//     IN p_type VARCHAR(50),
//     IN p_access_global VARCHAR(20),
//     IN p_access_plan VARCHAR(20)
// )

    const bondList = jsonData.result.list.map(bond => ({
        symbol: bond.symbol,
        name: bond.name,
        country: bond.country,
        currency: bond.currency,
        exchange: bond.exchange,
        mic_code: bond.mic_code,
        type: bond.type,
        access_global: bond.access?.global,
        access_plan: bond.access?.plan
    }));

    const connection = await pool.getConnection();
    try {
        for (const bond of bondList) {
            await connection.query('CALL upsert_fixed_income(?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                bond.symbol || null,
                bond.name || null,
                bond.country || null,
                bond.currency || null,
                bond.exchange || null,
                bond.mic_code || null,
                bond.type || null,
                bond.access_global || null,
                bond.access_plan || null
            ]);
        }
    } finally {
        connection.release();
    }
}