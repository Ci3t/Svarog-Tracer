import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import './index.css';
import './styles/cosmetics.css';
import App from './App.jsx';
import { PresenceProvider } from './contexts/PresenceContext';
import { AuthProvider } from './contexts/AuthContext';

const isGithubPagesHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'ci3t.github.io' || window.location.hostname.endsWith('.github.io'));

const RouterComponent = isGithubPagesHost ? HashRouter : BrowserRouter;
const routerProps = isGithubPagesHost ? {} : { basename: import.meta.env.BASE_URL };

const assetBase = import.meta.env.BASE_URL || '/';
const normalizedAssetBase = assetBase.endsWith('/') ? assetBase : `${assetBase}/`;
if (typeof document !== 'undefined') {
  document.documentElement.style.setProperty('--asset-base', normalizedAssetBase);
  document.documentElement.style.setProperty('--asset-clara-bg', `url(${normalizedAssetBase}clara.jpg)`);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterComponent {...routerProps}>
      <AuthProvider>
        <PresenceProvider>
          <App />
        </PresenceProvider>
      </AuthProvider>
    </RouterComponent>
  </StrictMode>
);
