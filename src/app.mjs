const appName = 'terminal.kdanni.org';


/*****************
 *****  APP  *****
 *****************/

const startUpTime = new Date();
console.log(`${appName} starting up...`);

// process.on('warning', e => console.warn(e.stack));
process.setMaxListeners(0);

process.stdin.resume();//so the program will not close instantly

process.on('log-uptime', () => {
    const upTimeMilis =(new Date()).getTime() - startUpTime.getTime();
    const upTime = `${Math.floor(upTimeMilis / 1000 / 60 / 60)}:${Math.floor(upTimeMilis / 1000 / 60)%60}:${Math.floor(upTimeMilis / 1000)%60}.${upTimeMilis % 1000}`;
    console.log(`Up time: ${upTime}`);
});

function exitHandler(options, exitCode) {
    exitCode = exitCode || 0;
    const upTimeMilis =(new Date()).getTime() - startUpTime.getTime();
    const upTime = `${Math.floor(upTimeMilis / 1000 / 60 / 60)}:${Math.floor(upTimeMilis / 1000 / 60)%60}:${Math.floor(upTimeMilis / 1000)%60}.${upTimeMilis % 1000}`;
    console.log(`${appName} shutting down. Up time: ${upTime} Exit Status: ${exitCode}`);
    if (options.exit) process.exit(exitCode);
}
process.on('exit_event', exitHandler.bind(null,{exit:true}, 0));
process.on('exit_event_1', exitHandler.bind(null,{exit:true}, 1));
//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}, 0));
// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}, 0));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}, 0));
//catches uncaught exceptions
process.on('uncaughtException', async (err) => {
    console.error('Uncaught Exception:', err);
    exitHandler({exit:true}, 1);
});

export default {appName};