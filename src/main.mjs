let commandString = '';
if (process.argv.length > 2) {
    for (let i = 2; i < process.argv.length; i++) {
        commandString += `${process.argv[i]} `;
    }
    commandString = commandString.trim();
}

if (/^no[- ]operation\b/.test(commandString)) {
    process.exit(0);
} else if (/^db[- ]?install\b/.test(commandString)) {
    dbinstall();
} else if (/^db[- ]?verify\b/.test(commandString)) {
    dbverify();
} else if (/^timescale(?::|[- ])?migrate\b/.test(commandString)) {
    timescaleMigrate();
} else if (/^seed(?::|[- ])?mysql\b/.test(commandString)) {
    seedMysql();
} else if (/^seed(?::|[- ])?timescale\b/.test(commandString)) {
    seedTimescale();
} else if (/^seed(?::|[- ])?all\b/.test(commandString)) {
    seedAll();
} else if (/^stock[- ]?list\b/.test(commandString)) {
    tdStockList();
} else if (/^forex[- ]?list\b/.test(commandString)) {
    tdForexList();
} else if (/^commodities[- ]?list\b/.test(commandString)) {
    tdCommoditiesList();
} else if (/^crypto(currencies)?[- ]?list\b/.test(commandString)) {
    tdCryptocurrenciesList();
} else if (/^etf[- ]?list\b/.test(commandString)) {
    tdEtfList();
} else if (/^fixed[- ]?income[- ]?list\b/.test(commandString)) {
    tdFixedIncomeList();
} else if (/^bond[- ]?list\b/.test(commandString)) {
    tdFixedIncomeList();
} else if (/^fund[- ]?list\b/.test(commandString)) {
    tdFundList();
} else {
    main();
}


async function dbinstall() {
    const { runProdInstall } = await import('./db-install/db-install.mjs');
    await runProdInstall();
    setTimeout(async () => { process.emit('exit_event'); }, 1000);
}

async function dbverify() {
    const { verifyProdIdempotency } = await import('./db-install/verify-idempotency.mjs');
    await verifyProdIdempotency();
    setTimeout(async () => { process.emit('exit_event'); }, 1000);
}

async function timescaleMigrate() {
    const { runTimescaleMigrations } = await import('./postgres/timescale-migrate.mjs');
    await runTimescaleMigrations();
    setTimeout(async () => { process.emit('exit_event'); }, 1000);
}

async function seedMysql(emitExit = true) {
    const { seedMysqlDatabase } = await import('./seeds/mysql-seed.mjs');
    await seedMysqlDatabase();
    if (emitExit) {
        setTimeout(async () => { process.emit('exit_event'); }, 1000);
    }
}

async function seedTimescale(emitExit = true) {
    const { seedTimescaleDatabase } = await import('./seeds/timescale-seed.mjs');
    await seedTimescaleDatabase();
    if (emitExit) {
        setTimeout(async () => { process.emit('exit_event'); }, 1000);
    }
}

async function seedAll() {
    await seedMysql(false);
    await seedTimescale(false);
    setTimeout(async () => { process.emit('exit_event'); }, 1000);
}

async function main() {
    await import('./log/event-logger.mjs');
    const emitter = (await import('./event-emitter.mjs')).default;
    emitter.on('main', () => {/* NOP */ });

    await import('./main/main.mjs');
}

async function tdStockList() {
    const { getStockList } = await import('./twelve-data/asset-catalogs/stock-list.mjs');
    await getStockList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

async function tdForexList() {
    const { getForexPairsList } = await import('./twelve-data/asset-catalogs/forex-pairs-list.mjs');
    await getForexPairsList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

async function tdCommoditiesList() {
    const { getCommoditiesList } = await import('./twelve-data/asset-catalogs/commodities-list.mjs');
    await getCommoditiesList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

async function tdCryptocurrenciesList() {
    const { getCryptocurrenciesList } = await import('./twelve-data/asset-catalogs/cryptocurrency-pairs.mjs');
    await getCryptocurrenciesList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

async function tdEtfList() {
    const { getEtfList } = await import('./twelve-data/asset-catalogs/etf-list.mjs');
    await getEtfList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

async function tdFixedIncomeList() {
    const { getFixedIncomeList } = await import('./twelve-data/asset-catalogs/fixedincome-list.mjs');
    await getFixedIncomeList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

async function tdFundList() {
    const { getFundList } = await import('./twelve-data/asset-catalogs/found-list.mjs');
    await getFundList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}