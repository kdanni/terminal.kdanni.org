const serviceName = 'collector database';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://finance:finance@localhost:5432/market_data';

type PgModule = {
  Pool?: new (config: { connectionString?: string }) => PgPool;
  default?: {
    Pool?: new (config: { connectionString?: string }) => PgPool;
  };
};

type PgPool = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: ReadonlyArray<unknown>
  ): Promise<{ rows: T[] }>;
  end(): Promise<void>;
  on?: (event: 'error', listener: (error: Error) => void) => void;
};

type QueryResultRow = Record<string, unknown>;

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

export interface DummyRecord {
  id: number;
  label: string;
  created_at: string;
}

interface DummyRecordRow extends QueryResultRow {
  id: number | string;
  label: string;
  created_at: Date | string;
}

export async function initializeSchema(): Promise<void> {
  const pool = await getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dummy_records (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function insertDummyRecord(label: string): Promise<number> {
  const pool = await getPool();
  const result = await pool.query<{ id: number | string }>(
    `INSERT INTO dummy_records (label) VALUES ($1) RETURNING id`,
    [label]
  );

  const record = result.rows[0];

  if (!record) {
    throw new Error('Failed to insert dummy record');
  }

  return Number(record.id);
}

export async function getDummyRecords(): Promise<DummyRecord[]> {
  const pool = await getPool();
  const result = await pool.query<DummyRecordRow>(
    `SELECT id, label, created_at FROM dummy_records ORDER BY id DESC`
  );

  return result.rows.map((row: DummyRecordRow) => {
    const createdAtValue =
      row.created_at instanceof Date
        ? row.created_at
        : new Date(String(row.created_at));

    return {
      id: Number(row.id),
      label: row.label,
      created_at: createdAtValue.toISOString(),
    };
  });
}

export async function closeDatabase(): Promise<void> {
  if (isPoolClosed) {
    return;
  }

  const pool = await getPool();
  await pool.end();
  isPoolClosed = true;
  poolPromise = null;
}
