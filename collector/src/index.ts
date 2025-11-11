import { closeDatabase, initializeSchema } from './database.js';

const serviceName = 'terminal.kdanni.org collector';

async function main(): Promise<void> {
  console.log(`[startup] ${serviceName} initialized`);

  const { appliedMigrations } = await initializeSchema();

  if (appliedMigrations.length > 0) {
    console.log('[database] applied migrations:');
    for (const migration of appliedMigrations) {
      console.log(` - ${migration}`);
    }
  } else {
    console.log('[database] schema already up to date');
  }
}

main()
  .then(() => closeDatabase())
  .catch(async (error) => {
    console.error(`[error] ${serviceName} encountered a fatal error`, error);
    await closeDatabase();
    process.exitCode = 1;
  });
