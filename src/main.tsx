import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Prevent uncaught async promise rejections or bridge errors from crashing the WebView thread
window.addEventListener('unhandledrejection', (event) => {
  console.warn('[SystemGuard] Handled uncaught promise rejection:', event.reason);
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.warn('[SystemGuard] Handled global runtime error:', event.message);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

