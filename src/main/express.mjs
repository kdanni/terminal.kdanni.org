import appName from '../app.mjs';
import cors from 'cors';
import express from 'express';
import { errorHandler } from './../api/error-mw.mjs';
import assetCatalog from '../api/assets/route.mjs';
import exchangeCatalog from '../api/exchanges/route.mjs';
import watchListApi from '../api/watch-list/route.mjs';
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
app.options('/', cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
  res.send(`${appName.appName}`);
});

app.listen(port, () => {
  console.log(`${appName.appName} listening at *:${port}`);
});

app.use('/.well-known', wellKnown);

app.use('/api/assets', assetCatalog);
app.use('/api/exchanges', exchangeCatalog);
app.use('/api/watch-list', watchListApi);

app.use(errorHandler);

