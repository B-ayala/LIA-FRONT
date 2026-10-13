export const LOCALHOST_API = 'http://localhost:3000/api';
const configuredBase: string = import.meta.env.VITE_API_URL_LOCAL ?? LOCALHOST_API;

// Si falta la variable en un deploy, el front apuntaría a localhost del navegador del usuario sin avisar.
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL_LOCAL) {
  console.error('VITE_API_URL_LOCAL no está definida: las llamadas al backend irán a localhost.');
}

/** URL base del backend propio. Única fuente de verdad para services y componentes. */
export const API_BASE_URL = configuredBase;
