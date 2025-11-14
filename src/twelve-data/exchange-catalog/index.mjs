import { getTwelveDataApiKey } from '../api-key.mjs';
import { ingestExchangeCatalog } from './ingest.mjs';

export async function runExchangeCatalogIngestion() {
    getTwelveDataApiKey();

    console.info('[twelve-data] Starting exchange catalog ingestion.');
    const { total, accepted, upserted } = await ingestExchangeCatalog();
    console.info('[twelve-data] Exchange catalog ingestion complete.', {
        records_received: total,
        records_validated: accepted,
        records_upserted: upserted
    });

    return { total, accepted, upserted };
}
