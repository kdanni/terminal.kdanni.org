import { closeDatabase, initializeSchema } from './database.js';
import { collectReferenceDataAndSeries } from './ingest.js';

const serviceName = 'terminal.kdanni.org collector';

async function main(): Promise<void> {
  console.log(`[startup] ${serviceName} initialized`);

  const { appliedMigrations, refreshedObjects } = await initializeSchema();

  if (appliedMigrations.length > 0) {
    console.log('[database] applied migrations:');
    for (const migration of appliedMigrations) {
      console.log(` - ${migration}`);
    }
  } else {
    console.log('[database] schema already up to date');
  }

  if (refreshedObjects.length > 0) {
    console.log('[database] refreshed replaceable objects:');
    for (const object of refreshedObjects) {
      console.log(` - ${object}`);
    }
  }

  const ingestionReport = await collectReferenceDataAndSeries();
  console.log(`[ingest] provider ${ingestionReport.providerCode}`);

  for (const equity of ingestionReport.equities) {
    console.log(` [equity] ${equity.symbol}: ${equity.rowsUpserted} rows upserted`);
  }

  for (const fx of ingestionReport.fx) {
    console.log(` [fx] ${fx.pair}: ${fx.rowsUpserted} rows upserted`);
  }
}

main()
  .then(() => closeDatabase())
  .catch(async (error) => {
    console.error(`[error] ${serviceName} encountered a fatal error`, error);
    await closeDatabase();
    process.exitCode = 1;
  });
