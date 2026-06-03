import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initGlobalErrorHandlers, logger } from './utils/logger';

initGlobalErrorHandlers();
logger.info('app.started', { env: import.meta.env.MODE });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
