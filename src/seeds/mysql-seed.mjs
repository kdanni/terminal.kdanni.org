import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { collectSqlFiles } from '../sql/file-utils.mjs';
import { runSqlFiles } from '../sql/mysql-runner.mjs';
import { multipleStatementConnection } from '../db-install/connection.mjs';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const seedSqlDir = join(moduleDir, '..', '..', 'sql', 'seeds', 'mysql');

export async function seedMysqlDatabase() {
  const connection = await multipleStatementConnection();
  try {
    const files = await collectSqlFiles(seedSqlDir);
    console.log(`[seed:mysql] Executing ${files.length} SQL files`);
    await runSqlFiles(connection, files);
    console.log('[seed:mysql] Completed successfully');
  } finally {
    await connection.end();
  }
}
