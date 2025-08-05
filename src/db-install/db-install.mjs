import * as fs from 'node:fs/promises';
import { sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const metaUrlPath = fileURLToPath(new URL('.', import.meta.url));
const sqlDir = fileURLToPath(pathToFileURL(`${metaUrlPath}${sep}..${sep}..${sep}sql${sep}prod`));

// import mysql from 'mysql2/promise';
// export async function multipleStatementConnection() {
//     return mysql.createConnection({
//         host: MYSQL_HOST,
//         port: MYSQL_PORT,
//         user: MYSQL_USER,
//         database: DATABASE_NAME,
//         password: MYSQL_PASSWORD,
//         multipleStatements: true,
//     })
// };
import { multipleStatementConnection } from './connection/connection.mjs';
let connection;

setTimeout(async () => {
    console.log('[DB install.mjs]', metaUrlPath, sqlDir);
    try {
        connection = await multipleStatementConnection();

        const dir = await fs.opendir(sqlDir);
        const dirArray = [];
        for await (const dirent of dir) {
            dirArray.push(dirent);
            // 01-Tables/
            // 02-Upsert/
            // 03-Views/
            // 04-SP/
            // zz-Archive/01_SP_Archive_SP.sql
            // zz-Archive/02_EVENT_call_Archive_SP.sql
        }
        dirArray.sort((a, b) => { if (a.name < b.name) { return -1; } if (a.name > b.name) { return 1; } return 0; });
        for (const dirent of dirArray) {
            console.log(dirent.name);
            if (dirent.isDirectory()) {
                // console.log('isDirectory()');
                const subdir = await fs.opendir(`${sqlDir}${sep}${dirent.name}`);
                const subdirArray = [];
                for await (const sqlFile of subdir) {
                    subdirArray.push(sqlFile);
                }
                subdirArray.sort((a, b) => { if (a.name < b.name) { return -1; } if (a.name > b.name) { return 1; } return 0; });
                for (const sqlFile of subdirArray) {
                    console.log(sqlFile.name);
                    if (/^.git/.test(sqlFile.name)) {
                        continue;
                    }
                    if (sqlFile.isFile()) {
                        // console.log('sqlFile.isFile()');
                        const file = await fs.open(`${sqlDir}${sep}${dirent.name}${sep}${sqlFile.name}`);
                        let fileContent = `${await file.readFile({ encodings: 'UTF8' })}`;
                        // console.log(fileContent);
                        try {
                            await connection.query(fileContent);
                            file.close();
                        } catch (qErr) {
                            console.error(qErr);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        try {
            connection.end();
        } catch (ferr) {
            console.error(ferr);
        }
    }
    setTimeout(async () => { process.emit('exit_event'); }, 2000);
}, 2000);