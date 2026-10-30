import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppErrorBoundary from './components/common/ErrorBoundary/AppErrorBoundary'
import { purgeLegacyStoredSession } from './utils/authTokenStore'
import { loadWebAnalytics } from './utils/webAnalytics'
import { watchStaleChunks } from './utils/reloadOnStaleChunk'

watchStaleChunks()

// Versiones anteriores guardaban tokens en localStorage: se borran para que no queden legibles por JS.
purgeLegacyStoredSession()

// Antes de que React monte nada: si esto se hace en un useEffect (dentro de la
// app ya montada), el navegador puede restaurar el scroll de la visita
// anterior antes de que ese efecto llegue a correr — se ve como un salto de
// scroll apenas termina el loading inicial.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

loadWebAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
