import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/global.css';
import { HelpProvider } from './context/HelpContext.jsx';
import { UpgradeProvider } from './context/UpgradeContext.jsx';
import PwaUpdateNotice from './components/PwaUpdateNotice.jsx';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PwaUpdateNotice />
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} fallbackRedirectUrl="/teams">
      <BrowserRouter>
        <HelpProvider>
          <UpgradeProvider>
            <App />
          </UpgradeProvider>
        </HelpProvider>
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);