import { promises as fs } from 'node:fs';
import { join } from 'node:path';

function sortEntries(entries) {
  return entries.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export async function collectSqlFiles(rootDir) {
  let dirEntries;
  try {
    dirEntries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
  const ordered = sortEntries(dirEntries);
  const files = [];

  for (const entry of ordered) {
    if (entry.name.startsWith('.git')) {
      continue;
    }

    const fullPath = join(rootDir, entry.name);

    if (entry.isDirectory()) {
      const nestedFiles = await collectSqlFiles(fullPath);
      files.push(...nestedFiles);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.sql')) {
      files.push(fullPath);
    }
  }

  return files;
}
