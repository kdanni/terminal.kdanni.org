import appName from '../app.mjs';
import express from 'express';
import { errorHandler } from './../api/error-mw.mjs';

const app = express();
const port = process.env.FEEDGEN_PORT || process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`${appName.appName}`);
});

app.listen(port, () => {
    console.log(`${appName.appName} listening at *:${port}`);
});

import wellKnown from '../api/well-known/route.mjs';
app.use('/.well-known', wellKnown);

app.use(errorHandler);