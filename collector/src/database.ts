import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serviceName = 'collector database';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://finance:finance@localhost:5432/market_data';

const MIGRATIONS_TABLE = 'schema_migrations';
const MIGRATIONS_DIRECTORY = path.resolve(
  fileURLToPath(new URL('../migrations', import.meta.url))
);

type MigrationKind = 'persistent' | 'replaceable';

const MIGRATION_KIND_DIRECTORIES: Record<MigrationKind, string> = {
  persistent: path.join(MIGRATIONS_DIRECTORY, 'persistent'),
  replaceable: path.join(MIGRATIONS_DIRECTORY, 'replaceable'),
};

type PgModule = {
  Pool?: new (config: { connectionString?: string }) => PgPool;
  default?: {
    Pool?: new (config: { connectionString?: string }) => PgPool;
  };
};

type PgClient = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: ReadonlyArray<unknown>
  ): Promise<{ rows: T[]; rowCount: number }>;
  release(): void;
};

type PgPool = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: ReadonlyArray<unknown>
  ): Promise<{ rows: T[]; rowCount: number }>;
  connect(): Promise<PgClient>;
  end(): Promise<void>;
  on?: (event: 'error', listener: (error: Error) => void) => void;
};

type QueryResultRow = Record<string, unknown>;

export type Migration = {
  id: number;
  name: string;
  filename: string;
  fullPath: string;
};

export interface SchemaInitializationResult {
  appliedMigrations: string[];
  refreshedObjects: string[];
}

let poolPromise: Promise<PgPool> | null = null;
let isPoolClosed = false;

async function getPool(): Promise<PgPool> {
  if (isPoolClosed) {
    throw new Error('Cannot acquire a database connection after the pool has been closed.');
  }

  if (!poolPromise) {
    poolPromise = (async () => {
      // @ts-ignore pg is installed at runtime; type information is not required during compilation.
      const pg = (await import('pg')) as PgModule;
      const PoolCtor = pg.Pool ?? pg.default?.Pool;

      if (!PoolCtor) {
        throw new Error('Failed to load PostgreSQL driver. Expected pg.Pool to be available.');
      }

      const instance: PgPool = new PoolCtor({ connectionString });

      instance.on?.('error', (error: Error) => {
        console.error(`[error] ${serviceName} encountered an idle client error`, error);
      });

      return instance;
    })();
  }

  return poolPromise;
}

export async function getDatabasePool(): Promise<PgPool> {
  return getPool();
}

async function ensureMigrationsTable(pool: PgPool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function parseMigrationFilename(filename: string, directory: string): Migration | null {
  const match = filename.match(/^(\d{3,})_(.+)\.sql$/);

  if (!match) {
    return null;
  }

  const [, idPart, namePart] = match;
  const id = Number.parseInt(idPart, 10);

  if (!Number.isFinite(id)) {
    return null;
  }

  return {
    id,
    name: namePart.replace(/_/g, ' '),
    filename,
    fullPath: path.join(directory, filename),
  };
}

interface LoadMigrationsOptions {
  kind: MigrationKind;
  directory?: string;
}

async function loadMigrations({
  kind,
  directory,
}: LoadMigrationsOptions): Promise<Migration[]> {
  const baseDirectory = directory ?? MIGRATION_KIND_DIRECTORIES[kind];
  let entries: string[];

  try {
    entries = await fs.readdir(baseDirectory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const migrations = entries
    .filter((entry) => entry.endsWith('.sql'))
    .map((entry) => parseMigrationFilename(entry, baseDirectory))
    .filter((value): value is Migration => value !== null)
    .sort((a, b) => a.id - b.id);

  const ids = new Set<number>();
  for (const migration of migrations) {
    if (ids.has(migration.id)) {
      throw new Error(`Duplicate migration identifier detected: ${migration.id}`);
    }
    ids.add(migration.id);
  }

  return migrations;
}

async function executeMigrationSql(client: PgClient, migration: Migration): Promise<void> {
  const sql = await fs.readFile(migration.fullPath, 'utf8');
  await client.query(sql);
}

async function hasMigration(client: PgClient, id: number): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM ${MIGRATIONS_TABLE} WHERE id = $1) AS exists`,
    [id]
  );

  return Boolean(result.rows[0]?.exists);
}

async function applyMigration(client: PgClient, migration: Migration): Promise<void> {
  await executeMigrationSql(client, migration);
  await client.query(
    `INSERT INTO ${MIGRATIONS_TABLE} (id, name) VALUES ($1, $2)`,
    [migration.id, migration.name]
  );
}

export async function initializeSchema(): Promise<SchemaInitializationResult> {
  const pool = await getPool();
  await ensureMigrationsTable(pool);

  const persistentMigrations = await loadMigrations({ kind: 'persistent' });
  const replaceableMigrations = await loadMigrations({ kind: 'replaceable' });
  const appliedMigrations: string[] = [];
  const refreshedObjects: string[] = [];

  for (const migration of persistentMigrations) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `LOCK TABLE ${MIGRATIONS_TABLE} IN SHARE ROW EXCLUSIVE MODE`
      );

      if (await hasMigration(client, migration.id)) {
        await client.query('ROLLBACK');
        continue;
      }

      await applyMigration(client, migration);
      await client.query('COMMIT');
      appliedMigrations.push(migration.filename);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  for (const migration of replaceableMigrations) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await executeMigrationSql(client, migration);
      await client.query('COMMIT');
      refreshedObjects.push(migration.filename);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  return { appliedMigrations, refreshedObjects };
}

export const __testing = {
  parseMigrationFilename: (filename: string, directory: string = MIGRATIONS_DIRECTORY) =>
    parseMigrationFilename(filename, directory),
  loadMigrations,
};

export async function closeDatabase(): Promise<void> {
  if (isPoolClosed) {
    return;
  }

  const pool = await getPool();
  await pool.end();
  isPoolClosed = true;
  poolPromise = null;
}
