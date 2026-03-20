import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { PresenceProvider } from './contexts/PresenceContext';
import { AuthProvider } from './contexts/AuthContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <PresenceProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PresenceProvider>
    </BrowserRouter>
  </StrictMode>
);
