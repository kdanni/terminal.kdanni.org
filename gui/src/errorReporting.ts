export type ErrorContext = Record<string, unknown> | undefined;

export function logError(error: unknown, context?: ErrorContext): void {
  // In a real implementation, this would send errors to an external service like Sentry or Datadog.
  // For now, centralize logging so calls can be swapped with a reporting SDK later.
  // eslint-disable-next-line no-console
  console.error('[error-report]', { error, context });
}
