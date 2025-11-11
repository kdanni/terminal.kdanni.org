import {
  closeDatabase,
  getDummyRecords,
  initializeSchema,
  insertDummyRecord,
} from './database.js';

const serviceName = 'terminal.kdanni.org collector';

async function main(): Promise<void> {
  console.log(`[startup] ${serviceName} initialized`);

  await initializeSchema();

  const label = `boot record @ ${new Date().toISOString()}`;
  const insertedId = await insertDummyRecord(label);
  console.log(`[database] inserted dummy record with id ${insertedId}`);

  const records = await getDummyRecords();
  console.log('[database] retrieved dummy records:');
  console.table(records);
}

main()
  .then(() => closeDatabase())
  .catch(async (error) => {
    console.error(`[error] ${serviceName} encountered a fatal error`, error);
    await closeDatabase();
    process.exitCode = 1;
  });
