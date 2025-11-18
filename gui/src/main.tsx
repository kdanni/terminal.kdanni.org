import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import './styles.css';
import { validateEnv } from './env';
import { ThemeProvider } from './theme';
import { createAuth0Config } from './auth/config';
import { initErrorReporting } from './errorReporting';
import { startUptimeHeartbeat } from './monitoring';

async function bootstrap(): Promise<void> {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Unable to bootstrap the application: root container missing.');
  }

  try {
    const env = validateEnv(import.meta.env);
    initErrorReporting({
      sentryDsn: env.VITE_SENTRY_DSN,
      logtailSourceToken: env.VITE_LOGTAIL_SOURCE_TOKEN,
      environment: import.meta.env.MODE,
      release: env.VITE_RELEASE
    });
    startUptimeHeartbeat(env.VITE_UPTIME_HEARTBEAT_URL);

    if (import.meta.env.DEV && import.meta.env.VITE_USE_MSW === 'true') {
      try {
        const { setupMocks } = await import('./mocks/setup');
        await setupMocks();
      } catch (mockError) {
        console.warn('Failed to start the mock API layer, continuing without mocks.', mockError);
      }
    }

    const auth0Config = createAuth0Config(env);

    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ThemeProvider>
          <Auth0Provider
            domain={auth0Config.domain}
            clientId={auth0Config.clientId}
            authorizationParams={{
              redirect_uri: auth0Config.redirectUri,
              audience: auth0Config.audience
            }}
            cacheLocation={auth0Config.cacheLocation}
            useRefreshTokens={auth0Config.useRefreshTokens}
          >
            <App apiBaseUrl={env.VITE_API_BASE_URL} />
          </Auth0Provider>
        </ThemeProvider>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize the application', error);
    const message =
      error instanceof Error
        ? error.message
        : 'The application could not start due to invalid configuration.';
    const fallback = document.createElement('div');
    fallback.className = 'runtime-error';
    fallback.innerHTML = `<h2>Configuration error</h2><p>${message}</p>`;
    rootElement.replaceChildren(fallback);
  }
}

void bootstrap();
