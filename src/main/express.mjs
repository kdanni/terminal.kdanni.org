import appName from '../app.mjs';
import cors from 'cors';
import express from 'express';
import { errorHandler } from './../api/error-mw.mjs';
import { requireAuth } from '../api/auth0.mjs';
import assetCatalog from '../api/assets/route.mjs';
import stockCatalog from '../api/stocks/route.mjs';
import etfCatalog from '../api/etf/route.mjs';
import cryptoCatalog from '../api/crypto/route.mjs';
import exchangeCatalog from '../api/exchanges/route.mjs';
import fixedIncomeCatalog from '../api/fixincome/route.mjs';
import meApi from '../api/me/route.mjs';
import ohlcvApi from '../api/ohlcv/route.mjs';
import watchListApi from '../api/watch-list/route.mjs';
import forexApi from '../api/forex/route.mjs';
import wellKnown from '../api/well-known/route.mjs';

const app = express();
const port = process.env.API_PORT || process.env.PORT || 3000;

const parseOrigins = (value) =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const devOrigins = parseOrigins(process.env.CORS_DEV_ORIGINS);
const prodOrigins = parseOrigins(process.env.CORS_ALLOW_ORIGINS);
const isProduction = process.env.NODE_ENV === 'production';
const useDevOrigins = !isProduction && devOrigins.length > 0;
const allowedOrigins = useDevOrigins ? devOrigins : prodOrigins;

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error('Not allowed by CORS');
    error.status = 403;
    return callback(error);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  exposedHeaders: ['Content-Length', 'Content-Range'],
  credentials: !useDevOrigins,
  maxAge: isProduction ? 600 : 60,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// DO NOT use app.options('*', cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
  res.send(`${appName.appName}`);
});

app.use('/api', requireAuth);

app.listen(port, () => {
  console.log(`${appName.appName} listening at *:${port}`);
});

app.use('/.well-known', wellKnown);

app.use('/api/assets', assetCatalog);
app.use('/api/stocks', stockCatalog);
app.use('/api/etf', etfCatalog);
app.use('/api/crypto', cryptoCatalog);
app.use('/api/exchanges', exchangeCatalog);
app.use('/api/fixincome', fixedIncomeCatalog);
app.use('/api/me', meApi);
app.use('/api/ohlcv', ohlcvApi);
app.use('/api/watch-list', watchListApi);
app.use('/api/forex', forexApi);

app.use(errorHandler);

