// Import FIRST: rewrites legacy "#/..." links before the router module reads
// window.location at eval time.
import './app/hash-redirect'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppProviders } from './app/providers'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
)
