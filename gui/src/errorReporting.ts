import * as Sentry from '@sentry/react';

export type ErrorContext = Record<string, unknown> | undefined;

type ErrorReporterConfig = {
  sentryDsn?: string;
  environment: string;
  release?: string;
  logtailSourceToken?: string;
};

let logtailToken: string | null = null;
let sentryConfigured = false;

function sendLogtail(level: 'error' | 'info', payload: unknown, context?: ErrorContext): void {
  if (!logtailToken) {
    return;
  }

  const body = {
    level,
    message: payload instanceof Error ? payload.message : String(payload),
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };

  fetch('https://in.logtail.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${logtailToken}`
    },
    body: JSON.stringify(body),
    keepalive: true
  }).catch((logError) => {
    console.warn('Logtail reporting failed', logError);
  });
}

export function initErrorReporting(config: ErrorReporterConfig): void {
  if (config.sentryDsn && !sentryConfigured) {
    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.environment,
      release: config.release,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.1
    });
    sentryConfigured = true;
  }

  if (config.logtailSourceToken) {
    logtailToken = config.logtailSourceToken;
  }
}

export function logError(error: unknown, context?: ErrorContext): void {
  // eslint-disable-next-line no-console
  console.error('[error-report]', { error, context });

  if (sentryConfigured) {
    Sentry.captureException(error, { extra: context });
  }

  sendLogtail('error', error, context);
}
