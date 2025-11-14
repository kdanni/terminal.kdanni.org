import { promises as fs } from 'node:fs';

export async function runSqlFiles(connection, files) {
  for (const filePath of files) {
    const statement = await fs.readFile(filePath, 'utf8');
    if (!statement.trim()) {
      continue;
    }

    try {
      await connection.query(statement);
    } catch (error) {
      error.message = `[${filePath}] ${error.message}`;
      throw error;
    }
  }
}
