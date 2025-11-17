import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import './styles.css';
import { validateEnv } from './env';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Unable to bootstrap the application: root container missing.');
}

try {
  const env = validateEnv(import.meta.env);

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Auth0Provider
        domain={env.VITE_AUTH0_DOMAIN}
        clientId={env.VITE_AUTH0_CLIENT_ID}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: env.VITE_AUTH0_AUDIENCE
        }}
        cacheLocation="localstorage"
        useRefreshTokens
      >
        <App apiBaseUrl={env.VITE_API_BASE_URL} />
      </Auth0Provider>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to initialize the application', error);
  const message =
    error instanceof Error ? error.message : 'The application could not start due to invalid configuration.';
  const fallback = document.createElement('div');
  fallback.className = 'runtime-error';
  fallback.innerHTML = `<h2>Configuration error</h2><p>${message}</p>`;
  rootElement.replaceChildren(fallback);
}
