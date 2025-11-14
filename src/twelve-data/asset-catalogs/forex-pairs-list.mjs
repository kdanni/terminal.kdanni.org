import got from 'got';
import { pool } from '../../mysql/mysql2-env-connection.mjs';
import { withTwelveDataApiKey } from '../api-key.mjs';

export async function getForexPairsList() {
    const requestUrl = withTwelveDataApiKey('https://api.twelvedata.com/forex_pairs', { source: 'docs' });
    const response = await got(requestUrl);

    let jsonData;

    try {
        jsonData = JSON.parse(response.body);
    } catch (error) {
        console.error('Error parsing JSON data:', error);
        return;
    }    

    // Process the response and return the forex pairs list
    const forexPairsList = jsonData.data.map(pair => ({
        symbol: pair.symbol,
        currency_group: pair.currency_group,
        currency_base: pair.currency_base,
        currency_quote: pair.currency_quote
    }));

    // console.log('Forex Pairs List:', forexPairsList);

    // Using MySQL connection pool to insert forex pairs data via upsert_forex_pair SP call
    const connection = await pool.getConnection();
    try {
        for (const pair of forexPairsList) {
            await connection.query('CALL upsert_forex_pairs_list(?, ?, ?, ?)', [
                pair.symbol || null,
                pair.currency_group || null,
                pair.currency_base,
                pair.currency_quote
            ]);
        }
    } finally {
        connection.release();
    }
}
