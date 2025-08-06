import got from 'got';
import { pool } from '../../mysql/mysql2-env-connection.mjs';


export async function getStockList() {
    // API call to Twelve Data Docs endpoint
    const response = await got('https://api.twelvedata.com/stocks?apikey=demo&source=docs');

    let jsonData;

    
    try {
        jsonData = JSON.parse(response.body);
    } catch (error) {
        console.error('Error parsing JSON data:', error);
        return;
    }
    

    // Process the response and return the stock list
    const stockList = jsonData.data.map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        currency: stock.currency,
        exchange: stock.exchange,
        mic_code: stock.mic_code,
        country: stock.country,
        type: stock.type,
        figi_code: stock.figi_code,
        cfi_code: stock.cfi_code,
        isin: stock.isin,
        cusip: stock.cusip,
        access: stock.access
    }));

    // Using MySQL connection pool to insert stock data via upsert_stock SP call
    const connection = await pool.getConnection();
    try {
        for (const stock of stockList) {
            await connection.query('CALL upsert_stock(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                stock.symbol,
                stock.name,
                stock.currency,
                stock.exchange,
                stock.mic_code || null,
                stock.country || null,
                stock.type || null,
                stock.figi_code || null,
                stock.cfi_code || null,
                stock.isin || null,
                stock.cusip || null,
                stock.access?.global || null,
                stock.access?.plan || null
            ]);
        }
    } finally {
        connection.release();
    }
}