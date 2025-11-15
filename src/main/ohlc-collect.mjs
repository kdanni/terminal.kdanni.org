import { collectWatchListOhlc } from '../market-data/collect-watch-list-ohlc.mjs';

export async function collectDailyOhlc() {
    await collectWatchListOhlc({ interval: '1d', lookback: 90 });
}

export async function collectHourlyOhlc() {
    await collectWatchListOhlc({ interval: '1h', lookback: 168 });
}
