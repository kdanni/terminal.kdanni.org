import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import pg from 'pg';

import { collectSqlFiles } from '../sql/file-utils.mjs';
import { runSqlFiles } from '../sql/postgres-runner.mjs';
import { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } from './pgPromise-env-connection.mjs';

const { Client } = pg;
const moduleDir = dirname(fileURLToPath(import.meta.url));
const timescaleSqlDir = join(moduleDir, '..', '..', 'sql', 'timescale');

export async function runTimescaleMigrations() {
  const client = new Client({
    host: POSTGRES_HOST,
    port: POSTGRES_PORT,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DB,
  });

  await client.connect();

  try {
    const files = await collectSqlFiles(timescaleSqlDir);
    console.log(`[timescale:migrate] Executing ${files.length} SQL files`);
    await runSqlFiles(client, files);
    console.log('[timescale:migrate] Completed without errors');
  } finally {
    await client.end();
  }
}
