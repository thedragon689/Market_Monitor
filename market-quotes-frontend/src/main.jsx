import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { loadPersistedState } from './utils/persist.js'
import App from './App.jsx'

const savedTheme = loadPersistedState().theme || 'dark'
document.documentElement.dataset.theme = savedTheme

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
