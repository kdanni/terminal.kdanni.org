export async function setupMocks(): Promise<void> {
  if (!(import.meta.env.DEV && import.meta.env.VITE_USE_MSW === 'true')) {
    return;
  }

  const { worker } = await import('./browser');

  await worker.start({
    serviceWorker: {
      url: '/mockServiceWorker.js'
    },
    onUnhandledRequest: 'bypass'
  });

  console.info('MSW enabled: API requests are served from local fixtures.');
}
