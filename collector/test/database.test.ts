import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { __testing } from '../src/database.js';
import type { Migration } from '../src/database.js';

const tempDirectories: string[] = [];

afterEach(async () => {
  while (tempDirectories.length > 0) {
    const dir = tempDirectories.pop();
    if (!dir) continue;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe('parseMigrationFilename', () => {
  it('parses well-formed filenames with numeric prefixes', () => {
    const result = __testing.parseMigrationFilename('001_create_table.sql', '/tmp/migrations');

    assert.ok(result);
    const expected: Migration = {
      id: 1,
      name: 'create table',
      filename: '001_create_table.sql',
      fullPath: path.join('/tmp/migrations', '001_create_table.sql'),
    };

    assert.deepStrictEqual(result, expected);
  });

  it('returns null for filenames without an id prefix', () => {
    assert.strictEqual(__testing.parseMigrationFilename('invalid.sql'), null);
  });
});

describe('loadMigrations', () => {
  it('sorts migrations numerically regardless of filesystem order', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'migrations-'));
    tempDirectories.push(tmp);

    await fs.writeFile(path.join(tmp, '002_second.sql'), '-- second');
    await fs.writeFile(path.join(tmp, '001_first.sql'), '-- first');
    await fs.writeFile(path.join(tmp, 'notes.txt'), 'ignore');

    const migrations = await __testing.loadMigrations({ directory: tmp, kind: 'persistent' });

    assert.deepStrictEqual(
      migrations.map((migration) => migration.filename),
      ['001_first.sql', '002_second.sql']
    );
  });

  it('loads repository migrations without duplicates', async () => {
    const persistentMigrations = await __testing.loadMigrations({ kind: 'persistent' });
    const persistentIds = persistentMigrations.map((migration) => migration.id);

    assert.ok(persistentMigrations.length > 0, 'expected at least one persistent migration');
    assert.strictEqual(new Set(persistentIds).size, persistentIds.length);

    const replaceableMigrations = await __testing.loadMigrations({ kind: 'replaceable' });
    const replaceableIds = replaceableMigrations.map((migration) => migration.id);

    assert.ok(replaceableMigrations.length > 0, 'expected at least one replaceable migration');
    assert.strictEqual(new Set(replaceableIds).size, replaceableIds.length);
  });
});

describe('schema hygiene', () => {
  it('contains no view or materialized view definitions', async () => {
    const migrations = await __testing.loadMigrations({ kind: 'persistent' });

    for (const migration of migrations) {
      const contents = await fs.readFile(migration.fullPath, 'utf8');
      const normalized = contents.toUpperCase();
      assert.ok(!normalized.includes('CREATE VIEW'), `${migration.filename} should not define views`);
      assert.ok(
        !normalized.includes('CREATE MATERIALIZED VIEW'),
        `${migration.filename} should not define materialized views`
      );
    }
  });
});
