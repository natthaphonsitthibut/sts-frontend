import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppProviders } from './app/providers'

// Legacy/QR magic links use a hash route (e.g. "/#/task/<token>"). This app uses
// history routing, so rewrite "#/..." to a real path before the router mounts —
// otherwise those links just land on the home page.
if (window.location.hash.startsWith('#/')) {
  window.history.replaceState(null, '', window.location.hash.slice(1))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
)
