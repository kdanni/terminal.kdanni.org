import { fetchExchangeCatalog } from './fetch-catalog.mjs';
import { persistExchangeCatalog } from './persist-catalog.mjs';

export async function ingestExchangeCatalog() {
    const { exchanges, metadata } = await fetchExchangeCatalog();
    const { upserted } = await persistExchangeCatalog(exchanges);

    return {
        total: metadata.total,
        accepted: metadata.accepted,
        upserted
    };
}
