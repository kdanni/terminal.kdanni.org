import got from 'got';
import { pool } from '../../mysql/mysql2-env-connection.mjs';

export async function getCommoditiesList() {
    // API call to Twelve Data Docs endpoint
    const response = await got('https://api.twelvedata.com/commodities?apikey=demo&source=docs');

    let jsonData;

    try {
        jsonData = JSON.parse(response.body);
    } catch (error) {
        console.error('Error parsing JSON data:', error);
        return;
    }    

    // Process the response and return the commodities list
    const commoditiesList = jsonData.data.map(item => ({
        symbol: item.symbol,
        name: item.name,
        category: item.category,
        description: item.description
    }));

    // console.log('Commodities List:', commoditiesList);

    // Using MySQL connection pool to insert commodities data via upsert_commodities SP call
    const connection = await pool.getConnection();
    try {
        for (const item of commoditiesList) {
            await connection.query('CALL upsert_commodities(?, ?, ?, ?)', [
                item.symbol || null,
                item.name || null,
                item.category || null,
                item.description || null
            ]);
        }
    } finally {
        connection.release();
    }
}
