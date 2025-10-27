import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// StrictMode geçici olarak kapatıldı - double mount'u engellemek için
root.render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
