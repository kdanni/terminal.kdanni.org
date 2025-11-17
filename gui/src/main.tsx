import React from 'react';
import ReactDOM from 'react-dom/client';
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
      <App apiBaseUrl={env.VITE_API_BASE_URL} />
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
