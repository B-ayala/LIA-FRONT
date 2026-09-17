import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Antes de que React monte nada: si esto se hace en un useEffect (dentro de la
// app ya montada), el navegador puede restaurar el scroll de la visita
// anterior antes de que ese efecto llegue a correr — se ve como un salto de
// scroll apenas termina el loading inicial.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
