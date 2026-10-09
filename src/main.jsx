import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Admin from './Admin.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

const isAdmin = window.location.pathname === '/admin'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin
      ? <ErrorBoundary variant="admin"><Admin /></ErrorBoundary>
      : <ErrorBoundary variant="app"><App /></ErrorBoundary>}
  </StrictMode>,
)
