import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import mysql from 'mysql2/promise';

import { collectSqlFiles } from '../sql/file-utils.mjs';
import { runSqlFiles } from '../sql/mysql-runner.mjs';
import { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, DATABASE_NAME } from '../mysql/mysql2-env-connection.mjs';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const prodSqlDir = join(moduleDir, '..', '..', 'sql', 'prod');

function buildScratchDatabaseName() {
  const base = DATABASE_NAME || 'terminal';
  return `${base}_verify_${randomUUID().replace(/-/g, '')}`;
}

export async function verifyProdIdempotency() {
  const scratchDb = buildScratchDatabaseName();
  console.log(`[db:verify] Creating scratch database ${scratchDb}`);
  const serverConnection = await mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    multipleStatements: true,
  });

  try {
    await serverConnection.query(`CREATE DATABASE \`${scratchDb}\``);
    const scratchConnection = await mysql.createConnection({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: scratchDb,
      multipleStatements: true,
    });

    try {
      const files = await collectSqlFiles(prodSqlDir);
      console.log(`[db:verify] Running ${files.length} migration files`);
      await runSqlFiles(scratchConnection, files);
      console.log('[db:verify] First pass completed');
      await runSqlFiles(scratchConnection, files);
      console.log('[db:verify] Second pass completed without errors');
    } finally {
      await scratchConnection.end();
    }
  } finally {
    try {
      console.log(`[db:verify] Dropping scratch database ${scratchDb}`);
      await serverConnection.query(`DROP DATABASE IF EXISTS \`${scratchDb}\``);
    } finally {
      await serverConnection.end();
    }
  }
}
