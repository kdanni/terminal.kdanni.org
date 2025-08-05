import emitter from '../event-emitter.mjs'

const ECHO_EVENT_EMITTER_EVENTS = `${process.env.ECHO_EVENT_EMITTER_EVENTS}` === 'true' ? true : false;
const eventNames = {};
eventNames['newListener'] = true;
eventNames['removeListener'] = true;


function logEvent(eventName, args) {
    // const parameters = args.join(', ');
    console.log(`[event-logger] [ECHO] eventName: "${eventName}", args:`, args);
}

function handleEventName(eventName) {
    if(eventNames[`${eventName}`]) {
        return;
    }
    console.log(`[event-logger] [newListener] eventName: ${eventName}`);
    eventNames[`${eventName}`] = true;
    emitter.on(`${eventName}`, (...args) => { logEvent(`${eventName}`, args); } );
}

if(ECHO_EVENT_EMITTER_EVENTS) {    
    emitter.on('newListener', (eventName, listener) => { 
        handleEventName(`${eventName}`);
    });
    const emitterEventNames = emitter.eventNames();
    for (const eventName of emitterEventNames ) {
        handleEventName(`${eventName}`);
    }
}