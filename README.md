# damiana-bella — Frontend

SPA de la tienda **damiana-bella** en **React 19 + TypeScript + Vite**. Consume **Supabase**
(auth y lecturas públicas de catálogo/contenido) y la **API Express** del backend
([LIA-BACK](https://github.com/B-ayala/LIA-BACK)) para órdenes, pagos, envíos, Cloudinary y
administración.

## Puesta en marcha

Requiere **Node 22.x**.

```bash
npm install
cp .env.example .env.local   # completar VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL_LOCAL
npm run dev                  # http://localhost:5173
```

Necesita el backend corriendo en `http://localhost:3000` para todo lo que no sea catálogo.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR. |
| `npm run build` | `tsc -b && vite build` → `dist/`. |
| `npm run preview` | Sirve el build de producción localmente. |
| `npm run lint` | ESLint. |
| `npm run test:e2e` | Playwright (requiere front y backend levantados). |
| `npm run deploy` | Build + `vercel --prod`. |

## Documentación

| Documento | Contenido |
|---|---|
| [DOCUMENTACION_FRONTEND.md](DOCUMENTACION_FRONTEND.md) | Referencia técnica: estructura, arquitectura, flujos, configuración, cómo levantar y troubleshooting. **Empezá por acá.** |
| [ONBOARDING_TESTERS.md](ONBOARDING_TESTERS.md) | Recorrido de las pantallas para QA. |
| [qa/test-plan.md](qa/test-plan.md) | Plan de pruebas con casos y resultados. |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios. |
