import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress known upstream warnings to keep the console clean
const originalWarn = console.warn;
console.warn = (...args) => {
    if (typeof args[0] === 'string') {
        if (args[0].includes("No character metrics for")) return;
    }
    originalWarn(...args);
};

const originalError = console.error;
console.error = (...args) => {
    if (typeof args[0] === 'string') {
        if (args[0].includes("WebSocket connection to 'wss://api.puter.com")) return;
        if (args[0].includes("streamGenerateContent")) return; // Hide standard rotation fallback errors
    }
    originalError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
