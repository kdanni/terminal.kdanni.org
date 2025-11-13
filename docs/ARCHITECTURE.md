# ARCHITECTURE.md

## Overview
The system is built as a **modular, service-oriented architecture** focused on financial time series collection, normalization, storage, and retrieval.  
Each component is designed to operate independently while communicating through defined interfaces.  
The primary goal is to provide a **scalable, transparent data infrastructure** suitable for long-term historical storage and downstream analytics.

---

## Base components
Vanilla javascript files. ES modules implemented in `.mjs` files.
- **APP.mjs**
 - implemented in `src/app.mjs`
 - log the start up then block the executin `process.stdin.resume();`
  - task **have to** trigger exit events 
   - `process.emit('exit_event');` - Exit with success.
   - `process.emit('exit_event_1');` - Exit with failed.   
 - handless exit signals
- **Event Emitter**
 - implemented in `src/event-emitter.mjs`
 - general use EventEmitter
  - prefered for event handling in case of small size messages
 - events are logged by `src\log\event-logger.mjs`
- **Main.mjs**
 - implemented in `src\main.mjs`
 - handles command line properties
 - based on command string imports modules dinamically
 - for prodoction tasks and servies imports modules under `src\main\`
 - no arg npm start task imports `src\main\main.mjs`
- **index.js**
 - implemented in `index.js`
 - imports `dotenv/config`
 - imports `./src/app.mjs`
 - imports `./src/main.mjs`


## High-Level Components

### One-shot tasks
- **DB Install**
 - The task initializes the master data DB structure on first run.
 - Subsecvent runs rebuild or migrate schemas
  - => SQL scripts **must be** idempotent or have a safe guard prevent multiple runs
 - npm task `dbinstall`
 - implemented under `src/db-install/`
 - SQL scripts under `sql/prod/`
    - SQL scripts under subdirectories run in alphabetic order. (Both subdirectory and file order)
 - Note: `sql/timescale/` directory is not managed
-**Twelve Data tasks**
 - Collects data from Twelve Data

### Always on applications
- **API backend service**
 - REST API host service
 - Technologies:
  - Express Javascript Framework
   - main application definition in `src/main/express.mjs`
   - API routes and middleware implementation under `src/api/`