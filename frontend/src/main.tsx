import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.tsx'

// No StrictMode: its double effect would POST /api/session twice and run the catch-up twice.
createRoot(document.getElementById('root')!).render(<App />)
