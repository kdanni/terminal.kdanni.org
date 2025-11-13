import got from 'got';
import { pool } from '../../mysql/mysql2-env-connection.mjs';

export async function getCryptocurrenciesList() {
    // API call to Twelve Data Docs endpoint
    const response = await got('https://api.twelvedata.com/cryptocurrencies?apikey=demo&source=docs');

    let jsonData;

    try {
        jsonData = JSON.parse(response.body);
    } catch (error) {
        console.error('Error parsing JSON data:', error);
        return;
    }    

    // Process the response and return the cryptocurrencies list
    const cryptocurrenciesList  = jsonData.data.map(item => ({
        symbol: item.symbol,
        available_exchanges: JSON.stringify( item.available_exchanges || []),
        currency_base: item.currency_base,
        currency_quote: item.currency_quote
    }));

    // console.log('Cryptocurrencies List:', cryptocurrenciesList);
    

    // Using MySQL connection pool to insert cryptocurrencies data via upsert_cryptocurrency_pair SP call
    const connection = await pool.getConnection();
    try {
        for (const item of cryptocurrenciesList) {
            await connection.query('CALL upsert_cryptocurrency_pair(?, ?, ?, ?)', [
                item.symbol || null,
                item.available_exchanges || null,
                item.currency_base || null,
                item.currency_quote || null
            ]);
        }
    } finally {
        connection.release();
    }
}
