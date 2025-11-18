import commandMap from './main/command-map.mjs';
import { main } from './main/commands.mjs';

let commandString = '';
if (process.argv.length > 2) {
    for (let i = 2; i < process.argv.length; i++) {
        commandString += `${process.argv[i]} `;
    }
    commandString = commandString.trim();
}

if (/^no[- ]operation\b/.test(commandString)) {
    process.exit(0);
}

let commandFound = false;
if (commandString) {
    for (const [command, handler] of commandMap.entries()) {
        if (command.test(commandString)) {
            handler();
            commandFound = true;
            break;
        }
    }
}

if (!commandFound) {
    main();
}
