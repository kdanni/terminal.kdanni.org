import { logError } from './errorReporting';
import { sanitizeUrl } from './sanitizers';

const DEFAULT_HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

function sendHeartbeat(url: string): void {
  const payload = JSON.stringify({ ts: new Date().toISOString(), userAgent: navigator.userAgent });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
    return;
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true
  }).catch((error) => logError(error, { source: 'uptime-heartbeat' }));
}

export function startUptimeHeartbeat(url?: string | null, intervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS): void {
  const sanitized = sanitizeUrl(url);
  if (!sanitized) {
    return;
  }

  sendHeartbeat(sanitized);
  setInterval(() => sendHeartbeat(sanitized), intervalMs);
}
