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
} else if (/^stock[- ]?list\b/.test(commandString)) {
    tdStockList();
} else if (/^forex[- ]?list\b/.test(commandString)) {
    tdForexList();
} else {
    main();
}


async function dbinstall() {
    await import('./db-install/db-install.mjs');
}

async function main() {
    await import('./log/event-logger.mjs');
    const emitter = (await import('./event-emitter.mjs')).default;
    emitter.on('main', () => {/* NOP */ });

    await import('./main/main.mjs');
}

async function tdStockList() {
    const { getStockList } = await import('./twelve-data/docs/stock-list.mjs');
    await getStockList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}

async function tdForexList() {
    const { getForexPairsList } = await import('./twelve-data/docs/forex-pairs-list.mjs');
    await getForexPairsList();

    setTimeout(() => { process.emit('exit_event'); }, 1000);
}