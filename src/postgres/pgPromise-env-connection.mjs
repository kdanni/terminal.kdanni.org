import pgPromise from 'pg-promise';
const pgp = pgPromise({/* Initialization Options */ });

export const POSTGRES_USER = process.env.POSTGRES_USER;
export const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD;
export const POSTGRES_HOST = process.env.POSTGRES_HOST;
export const POSTGRES_PORT = process.env.POSTGRES_PORT || 5432;
export const POSTGRES_DB = process.env.POSTGRES_DB || 'postgres';


const cn = `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;


export const db = pgp(cn);