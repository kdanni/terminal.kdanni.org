import { createConnection as cc, multipleStatementConnection as msc, pool as p } from '../../mysql/mysql2-env-connection.mjs';

export const createConnection = cc;
export const multipleStatementConnection = msc;
export const pool = p;