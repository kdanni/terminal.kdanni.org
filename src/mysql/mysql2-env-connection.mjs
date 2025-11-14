import mysql from 'mysql2/promise'

export const MYSQL_HOST = process.env.MYSQL_HOST
export const MYSQL_PORT = process.env.MYSQL_PORT || 3306
export const MYSQL_USER =  process.env.MYSQL_USER
export const DATABASE_NAME = process.env.DATABASE_NAME
export const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD

const MYSQL_POOL_LIMIT = process.env.MYSQL_POOL_LIMIT || 20

export async function createConnection() {
  return mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    database: DATABASE_NAME,
    password: MYSQL_PASSWORD
  })
}

export async function multipleStatementConnection() {
  return mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    database: DATABASE_NAME,
    password: MYSQL_PASSWORD,
    multipleStatements: true,
  })
}

export async function serverConnection() {
  return mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    multipleStatements: true,
  })
}

export const pool = `${MYSQL_POOL_LIMIT}` === '-1' ?
{
  execute : function () { throw "POOL = -1" },
  query : function () { throw "POOL = -1" }
}
: 
mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  database: DATABASE_NAME,
  password: MYSQL_PASSWORD,
  connectionLimit: MYSQL_POOL_LIMIT
})