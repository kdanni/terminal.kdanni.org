import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import pg from 'pg';

import { collectSqlFiles } from '../sql/file-utils.mjs';
import { runSqlFiles } from '../sql/postgres-runner.mjs';
import { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } from '../postgres/pgPromise-env-connection.mjs';

const { Client } = pg;
const moduleDir = dirname(fileURLToPath(import.meta.url));
const seedSqlDir = join(moduleDir, '..', '..', 'sql', 'seeds', 'timescale');

export async function seedTimescaleDatabase() {
  const client = new Client({
    host: POSTGRES_HOST,
    port: POSTGRES_PORT,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DB,
  });

  await client.connect();

  try {
    const files = await collectSqlFiles(seedSqlDir);
    console.log(`[seed:timescale] Executing ${files.length} SQL files`);
    await runSqlFiles(client, files);
    console.log('[seed:timescale] Completed successfully');
  } finally {
    await client.end();
  }
}
