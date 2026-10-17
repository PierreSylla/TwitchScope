import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { getTheme } from '@/lib/settings/storage';
import { applyTheme } from '@/lib/settings/theme';
import { applyStoredLanguage } from '@/lib/i18n/apply';
import './style.css';

// Before the first render, so an overridden theme does not flash the system one.
applyTheme(await getTheme());
await applyStoredLanguage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
