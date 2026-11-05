import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for installable PWA & offline support (works on both root domain & GitHub Pages subpath)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      // Service worker registration optional fallback
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
