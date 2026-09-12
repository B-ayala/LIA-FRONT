# Documentación Técnica — Frontend (damiana-bella / "lia")

> Documentación de **cómo está construido hoy** el frontend, pensada como referencia
> de consulta antes de hacer cualquier cambio. No describe features futuras ni propuestas:
> describe el estado actual del código.

---

## 1. Resumen

SPA de e-commerce (tienda **damiana-bella**) construida con **React 19 + TypeScript + Vite**.
Tiene dos grandes mundos:

- **Público** (`/`, `/products`, `/product/:id`, `/checkout`, `/about`, `/contact`): catálogo,
  detalle de producto, carrito y checkout.
- **Admin** (`/admin/*`): panel de gestión de productos, usuarios, ventas, despachos, home,
  about, footer, temas y Cloudinary. Protegido por rol `admin`.

El frontend obtiene datos de **dos fuentes**:

1. **Supabase** (cliente JS con la `anon key`) → lecturas de catálogo, categorías, carrusel,
   contenido de sitio, e inserción de ventas por transferencia y mensajes de contacto.
2. **API backend Express** (vía el wrapper `apiFetch`) → autenticación JWT, escritura de
   productos, Cloudinary, Mercado Pago, cálculo de envío y CRUD de usuarios admin.

> El código del backend Express está en `../../BACK/lia-store`. Ver
> `../../BACK/lia-store/DOCUMENTACION_BACKEND.md` para su estructura y el contrato de la API.
> ⚠️ Atención: ese backend implementa hoy un contrato **distinto** al que este frontend espera
> (auth sobre token de Supabase, sin `/auth/*` propios, sin `/orders/*` ni `/shipping`).

---

## 2. Tecnologías y librerías

| Categoría | Librería | Uso |
|---|---|---|
| Framework | `react` 19 + `react-dom` 19 | UI |
| Build/dev | `vite` 7 + `@vitejs/plugin-react` | bundler, HMR, build |
| Lenguaje | `typescript` ~5.9 | tipado estricto |
| Routing | `react-router-dom` 7 | rutas SPA |
| Estado | `zustand` 5 | stores globales (`auth`, `cart`, `admin`) |
| UI kit | `@mui/material` 7 + `@emotion/react`/`styled` | componentes + theming + CSS-in-JS |
| Animación | `framer-motion` 12 | transiciones / microinteracciones |
| Iconos | `lucide-react`, `react-icons` | iconografía |
| Formularios | `react-hook-form` 7 | formularios controlados |
| SEO | `react-helmet-async` 3 | `<head>` por ruta (componente `SEO`) |
| Datos remotos | `@supabase/supabase-js` 2 | cliente Supabase |
| Imágenes (build) | `vite-imagetools` | optimización de assets |
| Lint | `eslint` 9 + `typescript-eslint` | análisis estático |

Node requerido: **22.x** (`engines.node` en `package.json`). El workflow de CI usa Node 20.

---

## 3. Estructura de carpetas (`src/`)

```
src/
├── App.tsx                     # Providers globales (Helmet, MUI Theme, Season, Router, InitialLoad) + Footer/WhatsApp condicionales
├── main.tsx                    # Bootstrap: createRoot + <StrictMode>
├── index.css                   # Estilos base globales
│
├── routes/
│   └── AppRouter.tsx           # Árbol de rutas (público / admin / auth) con lazy loading
│
├── config/
│   └── supabaseClient.ts       # Instancia única del cliente Supabase (anon key)
│
├── services/                   # Capa de acceso a datos (Supabase directo + API Express)
│   ├── authService.ts          # /auth/* (JWT propio): register, login, logout, me, refresh, etc.
│   ├── userService.ts          # wrappers de auth para componentes + CRUD admin (/users)
│   ├── productService.ts       # productos (read Supabase / write API), Cloudinary, categorías, carrusel
│   ├── orderService.ts         # ventas: transferencia (Supabase) + Mercado Pago (API)
│   └── siteContentService.ts   # tabla site_content (about, footer, banner, temas) get/save/delete
│
├── store/                      # Estado global público
│   ├── authStore.ts            # sesión (currentUser / isAuthenticated=admin), hidratación, initializeAuth
│   └── cartStore.ts            # carrito persistido (zustand/persist) + item de checkout
│
├── types/
│   └── product.ts              # Product, Variant, Specification, FAQ, Review
│
├── hooks/                      # hooks reutilizables
│   ├── useBodyScrollLock.ts    # bloquea scroll del body (modales/drawers)
│   ├── useClickOutside.ts      # cierre por click externo
│   └── usePagination.ts        # paginación de listados
│
├── utils/                      # utilidades transversales
│   ├── apiFetch.ts             # wrapper fetch: Bearer token + refresh automático + cola + fallback ngrok
│   ├── tokenStorage.ts         # tokens/usuario en localStorage (access/refresh/user)
│   ├── auth.ts                 # helpers de auth
│   ├── theme.ts                # tema MUI
│   ├── SeasonThemeProvider.tsx # tema estacional dinámico
│   ├── seasonThemes.ts         # definición de temas por temporada
│   ├── seasons.css             # estilos estacionales
│   ├── constants.ts            # COLOR_PALETTE, COLOR_MAP, parseColorOption
│   ├── pricing.ts              # cálculo de precio final / descuentos
│   ├── productVariants.ts      # validación de variantes, stock por opción, sanitización
│   ├── cloudinary.ts           # helpers de URLs/transformaciones Cloudinary
│   ├── formatters.ts           # formateo (precios, fechas, etc.)
│   ├── labels.ts               # labels/textos
│   ├── errorMessage.ts         # normalización de mensajes de error a lenguaje humano
│   └── validation.ts           # validaciones de formularios
│
├── components/common/          # componentes compartidos público/admin
│   ├── Footer/                 # pie de página (lee footerInfo)
│   ├── Modal/                  # Modal + ConfirmationModal (sistema de modales)
│   ├── InitialLoad/            # InitialLoadProvider + pantalla de carga inicial
│   ├── NavigationLoad/         # NavigationLoadProvider + pantalla de carga entre rutas
│   ├── SEO/                    # SEO.tsx (react-helmet-async)
│   ├── VariantTable/           # tabla de variantes
│   ├── WhatsAppButton/         # botón flotante de WhatsApp
│   └── ScrollToTop.tsx         # resetea scroll al cambiar de ruta
│
├── users/                      # mundo público
│   ├── layout/UserLayout.tsx   # layout público (NavBar + outlet)
│   ├── components/
│   │   ├── ProductCard/        # tarjeta de producto
│   │   ├── ProductGrid/        # grilla de productos
│   │   ├── PurchaseVariantModal/  # selección de variantes al comprar
│   │   ├── SeasonalBackdrop/   # fondo estacional
│   │   ├── auth/AuthModal.tsx  # modal login/registro
│   │   ├── cart/CartDrawer.tsx # drawer de carrito
│   │   └── header/             # Carousel, NavBar, TopNavBar, ChangePasswordModal,
│   │                           #   MyPurchasesModal, UserProfileDropdown
│   └── pages/
│       ├── home/Home.tsx
│       ├── products/Products.tsx
│       ├── producDetail/ProductDetail.tsx   # (sic) detalle + cálculo de envío
│       ├── checkout/Checkout.tsx + CheckoutResult.tsx
│       ├── about/About.tsx
│       ├── contact/Contact.tsx
│       └── auth/EmailConfirmation.tsx + ResetPassword.tsx
│
└── admin/                      # mundo admin
    ├── layout/                 # AdminLayout, AdminHeader, AdminSidebar
    ├── routes/AdminProtectedRoute.tsx   # guard por rol admin
    ├── store/adminStore.ts     # estado del panel (products, users, carousel, about, footer)
    ├── styles/adminShared.css  # estilos compartidos del admin
    ├── components/             # CarouselManager, CloudinaryImagePicker, CloudinaryStorageUsage,
    │                           #   FeaturedProductsManager, ProductGallery, ProductModal, ProductTable
    └── pages/                  # Dashboard, Products, Users, Sales, Dispatches, AboutEditor,
                                #   FooterEditor, HomeManager, CloudinaryManager, ThemesManager
```

> Convención: cada componente vive en su carpeta con su `.tsx` y su `.css` colindante.
> Los estilos propios de un componente se aíslan en ese `.css`; los colores/tokens globales
> se reutilizan desde `utils/constants.ts` y el tema MUI (no hardcodear hex en componentes).

---

## 4. Arquitectura

### 4.1 Separación por dominios (`users/` vs `admin/`)
El código se organiza por **dominio funcional** antes que por tipo técnico: todo lo público
vive en `users/`, todo lo admin en `admin/`, y lo verdaderamente compartido en
`components/common/`, `services/`, `store/`, `utils/`. Esto permite que el bundle público
**no arrastre** código admin y viceversa (ver code-splitting abajo).

### 4.2 Capa de servicios
Los componentes **no llaman a Supabase ni a `fetch` directamente** (salvo casos puntuales):
pasan por `src/services/*`, que es la frontera de datos. Cada servicio decide si la operación
va por **Supabase directo** (lectura pública) o por la **API Express** (escritura/sensible).

| Servicio | Supabase directo | API Express |
|---|---|---|
| `authService` | Supabase Auth (login, signUp, verifyOtp, reset) + `profiles` | — |
| `userService` | — | `/users` (admin) + delega en `authService` |
| `productService` | read `productos`, `categories`, `carousel_images` | write `/products`, `/cloudinary/*` |
| `orderService` | — | `/orders/*` (transferencia, Mercado Pago, compras, cancelaciones, nudge) |
| `shippingService` | — | `/shipping?postalCode=` |
| `insightsService` | — | `/admin/insights/*` (solo admin) |
| `siteContentService` | `site_content` (read/write) | — |

### 4.3 Estado global (Zustand)
- **`authStore`** — sesión. Distingue dos flags:
  - `currentUser`: cualquier usuario autenticado (admin o user).
  - `isAuthenticated`: **solo admin validado** (es el gate de `AdminProtectedRoute`).
  - Hidrata sincrónicamente desde `localStorage` en el primer render (evita que `/admin` + F5
    redirija por un render temprano con sesión vacía). `initializeAuth()` valida contra
    `supabase.auth.getSession()`; ante error de red transitorio mantiene el estado hidratado en
    vez de expulsar al admin.
- **`cartStore`** — carrito persistido (`zustand/persist`, key `damiana-bella-cart`). Maneja
  `items[]` (carrito) y un `item` de checkout (puede venir del carrito o de compra directa).
  Toda mutación pasa por sanitización: clamp de cantidad a stock, validación de variantes por
  unidad y recálculo de precio.
- **`adminStore`** — estado del panel admin (products, users, carouselImages, aboutInfo,
  footerInfo) con sus acciones CRUD locales.

### 4.4 Render tree (`App.tsx`)
```
HelmetProvider
  └─ ThemeProvider (MUI) + CssBaseline
       └─ SeasonThemeProvider           # tema estacional
            └─ BrowserRouter
                 └─ InitialLoadProvider  # orquesta la pantalla de carga inicial
                      └─ AppContent
                           ├─ AppRouter            # NavigationLoadProvider + ScrollToTop + Suspense + Routes
                           ├─ Footer               # solo si NO es ruta /admin
                           └─ WhatsAppButton       # solo si NO es /admin ni /auth
```
`AppContent` arranca la autenticación (`setUserFromStorage` + `initializeAuth`) y escucha el
evento global `auth:logout` que dispara `apiFetch` cuando detecta token inválido o refresh
fallido, para forzar logout local.

---

## 5. Routing (`routes/AppRouter.tsx`)

Tres grupos de rutas. Las **páginas hoja son lazy** (`React.lazy` + `Suspense`); los layouts y
guards quedan **eager** (son wrappers siempre presentes).

| Grupo | Layout | Guard | Rutas |
|---|---|---|---|
| Auth | — | — | `/auth/confirm`, `/auth/reset-password` |
| Admin | `AdminLayout` | `AdminProtectedRoute` | `/admin` (index → HomeManager), `home`, `products`, `users`, `about`, `site-config`, `cloudinary`, `themes`, `sales`, `dispatches` |
| Público | `UserLayout` | — | `/`, `/products`, `/product/:id`, `/checkout`, `/checkout/result`, `/contact`, `/about` |

- `AdminProtectedRoute` valida `authStore.isAuthenticated` (rol admin).
- `InitialRouteReady` envuelve ciertas rutas para coordinarse con la pantalla de carga inicial.
- `RouteFallback` es el spinner de `Suspense` (usa variables de color del sistema, sin paleta nueva).

---

## 6. Flujos principales

### 6.1 Autenticación (Supabase Auth desde el cliente)
La sesión la maneja **Supabase Auth**; el backend Express no expone endpoints `/auth/*`, solo
**verifica** el access token que se le adjunta. Todo pasa por `services/authService.ts`.

1. **Login** (`AuthModal` → `authStore.login` → `authService.login`): `supabase.auth.signInWithPassword`.
   El perfil y el rol se leen de `profiles`; `tokenStorage` (localStorage) queda sincronizado
   solo para el estado de login de la UI.
2. **Sesión persistente**: `authStore` hidrata sincrónicamente desde localStorage en el primer
   render (evita que `/admin` + F5 rebote) y luego confirma contra `supabase.auth.getSession()`.
   `onAuthStateChange` mantiene el store al día.
3. **Refresh automático**: lo hace el SDK de Supabase. [apiFetch.ts](src/utils/apiFetch.ts) toma
   el token de la sesión en cada request; ante un `401` refresca vía Supabase y **reintenta una
   vez**, con cola para no disparar N refreshes en paralelo. Si el refresh falla → limpia sesión
   y emite el evento global `auth:logout`.
4. **Registro**: `supabase.auth.signUp` con confirmación de email; el link vuelve a
   `EmailConfirmation.tsx`, que valida con `supabase.auth.verifyOtp`. Reenvío con
   `supabase.auth.resend`.
5. **Recuperación**: `supabase.auth.resetPasswordForEmail` → link → `ResetPassword.tsx` →
   `supabase.auth.updateUser`; al terminar se cierra sesión y se fuerza re-login.
6. **Cambio de password** (logueado): re-autentica con la password actual antes de
   `updateUser`, y luego `signOut`.

> El backend usa estos tokens en `authMiddleware` (los verifica contra Supabase). Detalle en
> `../../BACK/lia-store/DOCUMENTACION_BACKEND.md` §6.

### 6.2 Catálogo
- `Home` / `Products` leen de Supabase (`fetchFeaturedProducts`, `fetchProducts`).
- `ProductDetail` lee el producto (`fetchProductById`) y, si no es envío gratis, consulta
  `GET /shipping?postalCode=…` para costo/plazo de envío.
- `NavBar` usa `fetchCategories` / `searchProducts` (búsqueda con `ilike` sobre `productos`).

### 6.3 Carrito y checkout
1. El usuario agrega al carrito (`cartStore.addItem`) o va a "compra directa" (setea `item`).
2. Cada unidad puede tener variantes (`PurchaseVariantModal`); se validan contra el producto.
3. En `Checkout` se elige método de pago:
   - **Transferencia**: `orderService.createOrder` → `POST /orders/transfer`. La escritura va por
     el backend a propósito: insertar directo en `ventas` con la anon key lo bloquea RLS
     (BUG-001). El trigger `trg_decrement_stock` descuenta stock al insertar.
   - **Mercado Pago**: `orderService.createMpPreference` → `POST /orders/mp-preference`,
     recibe `init_point` (redirección a MP) + `order_ids`. Si el usuario vuelve sin pagar,
     `cancelMpOrder` → `POST /orders/:id/cancel` (el backend restaura stock; hay sweep de respaldo
     cada 60 s).
4. `CheckoutResult` confirma el pago con `POST /orders/mp-confirm` (el backend lo verifica contra
   la API de MP, no confía en los parámetros de la URL) y muestra el resultado.
5. `POST /orders/nudge` registra el recordatorio al usuario con el pago pendiente.
6. `MyPurchasesModal` lista compras por email vía `GET /orders/user?email=…` (el backend
   bypassa RLS de Supabase y valida que seas el dueño o admin).

### 6.4 Admin
- `Products`: CRUD vía API (`/products`), imágenes vía Cloudinary firmado.
- `Sales`: lee `ventas` de Supabase; confirma/cancela transferencias vía
  `PATCH /orders/:id/confirm-transfer` y `/orders/:id/cancel-transfer` (solo admin).
- `Asistente`: analítica vía `GET /admin/insights/*` (`insightsService.ts`).
- `Dispatches`: gestiona estado de despacho sobre `ventas`.
- `Users`: lista/edita/borra usuarios vía `/users` (solo admin).
- `HomeManager` / `AboutEditor` / `FooterEditor` / `ThemesManager`: editan contenido en
  `site_content` y `carousel_images`.
- `CloudinaryManager`: explora carpetas/imágenes, uso de almacenamiento, sube/borra.

---

## 7. Configuración

### 7.1 Variables de entorno (Vite — prefijo `VITE_`)
Copiar `.env.example` a `.env.local` en la raíz del repo. **Nunca commitearlo.**

| Variable | Requerida | Descripción |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | URL del proyecto Supabase. Sin ella, `supabaseClient` lanza error en el arranque. |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Anon key (pública) de Supabase. |
| `VITE_API_URL_LOCAL` | ✅ (recomendada) | Base URL de la API Express, **con el sufijo `/api`**. Pese al nombre `_LOCAL`, es la URL del backend en **todos** los entornos (en Vercel también). Si falta, cae a `http://localhost:3000/api`. Soporta túneles ngrok (manda el header `ngrok-skip-browser-warning`). |

> `import.meta.env.BASE_URL` se usa para resolver assets según el `base` de despliegue.

### 7.2 Build / chunking (`vite.config.ts`)
- Plugins: `react()` + `imagetools()`.
- `manualChunks` separa vendors: `mui`, `router`, `supabase`, `query`, `motion`, `icons`,
  `react-vendor`, `vendor`. Mejora el caching y evita un único bundle gigante.

### 7.3 TypeScript
- `tsconfig.json` (referencias) → `tsconfig.app.json` (app) + `tsconfig.node.json` (config de build).
- `npm run build` corre `tsc -b` antes de `vite build` (el build falla si hay errores de tipos).

### 7.4 Despliegue
- **Vercel** (único destino activo): `vercel.json` define headers de seguridad (`X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`) y rewrite SPA
  (`/(.*) → /index.html`). Script `npm run deploy` (`vercel --prod`).

---

## 8. Cómo levantar el proyecto

Requisito: **Node 22.x** (`engines.node`).

```powershell
# Desde la raíz del repo frontend
cd "FRONT/damiana-bella"

# 1. Instalar dependencias
npm install

# 2. Copiar .env.example a .env.local y completar:
#    VITE_SUPABASE_URL=...
#    VITE_SUPABASE_ANON_KEY=...
#    VITE_API_URL_LOCAL=http://localhost:3000/api   # o el túnel ngrok del backend

# 3. Levantar en desarrollo (HMR)
npm run dev
```

Queda en **http://localhost:5173** (si el puerto está ocupado, Vite salta a 5174 — el backend
acepta cualquier `localhost` en desarrollo).

```powershell
# Otros comandos
npm run build     # tsc -b && vite build  → genera dist/
npm run preview   # sirve el build de producción localmente
npm run lint      # eslint .
npm run deploy    # build + vercel --prod
npm run test:e2e  # Playwright (necesita front y backend levantados)
```

### 8.1 Stack completo (frontend + backend)

Dos terminales, una por proceso:

```powershell
# Terminal 1 — backend (http://localhost:3000, API en /api)
cd "BACK/lia-store"; npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd "FRONT/damiana-bella"; npm run dev
```

Sin el **backend Express** corriendo no funcionan órdenes/pagos, envíos, Cloudinary ni la
administración de usuarios. Setup y variables del backend en
`../../BACK/lia-store/DOCUMENTACION_BACKEND.md` (§8 y §9).

### 8.2 Problemas frecuentes en local

| Síntoma | Causa probable | Solución |
|---|---|---|
| La app rompe en el arranque con error de Supabase | Faltan `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Completar `.env.local` y **reiniciar** `npm run dev` (Vite no recarga env en caliente) |
| Todas las llamadas al backend fallan (`Failed to fetch`) | Backend caído o `VITE_API_URL_LOCAL` sin `/api` | Levantar el backend; verificar la URL base |
| `503` al ir a Mercado Pago | Falta `MP_ACCESS_TOKEN` en el backend | Cargarlo en `BACK/lia-store/.env` |
| Requests bloqueadas por CORS | Origen del front fuera de la allowlist del backend | `NODE_ENV=development` en el backend, o sumar el origen a `FRONTEND_URL` |
| Cambié el `.env.local` y no toma | Vite lee env solo al iniciar | Reiniciar el dev server |

---

## 9. Modelo de datos (Supabase, visto desde el front)

Tablas que el frontend toca directamente con la `anon key`:

| Tabla | Operaciones desde el front | Notas |
|---|---|---|
| `productos` | read (público: `status='active'`; admin: todos) | mapeada a `Product` por `mapDbRowToProduct`. Campos snake_case: `image_url`, `original_price`, `free_shipping`, `return_policy`, `featured`, `status`. |
| `categories` | read/write | árbol por `parent_id` + `level`; con fallback a categorías derivadas de `productos`. |
| `carousel_images` | read/write | filtrable por `device_type` (`desktop`/`mobile`), `is_active`, `order`. |
| `site_content` | read/write/delete | clave-valor (`key`/`value` JSON) para about, footer, banner, temas. Requiere UNIQUE en `key`. |
| `ventas` | solo lectura (panel admin) | las altas van por el backend (RLS bloquea el insert con anon key — BUG-001); también la escribe el backend (MP, stock, despachos). Campos: `buyer_*`, `product_*`, `quantity`, `unit_price`, `total_price`, `units_config`, `payment_method`, `payment_status`, `shipping_method`, `dispatch_status`. |
| `contact_messages` | insert | mensajes del formulario de contacto. |

> `profiles` (roles/usuarios) y la escritura sensible de `productos`/`ventas` se manejan
> **desde el backend** con la `service_role` key, no desde el front.

---

## 10. Patrones y buenas prácticas detectadas

- **Frontera de datos en `services/`**: los componentes no hablan directo con Supabase/fetch.
- **`apiFetch` centraliza auth**: Bearer token tomado de la sesión de Supabase, refresh con cola
  anti-stampede, reintento único y evento global de logout forzado.
- **Rotación de tokens delegada a Supabase Auth**: el SDK refresca solo; `tokenStorage` es
  espejo para la UI, no la fuente de verdad (mitigación de XSS documentada ahí, con plan de
  migración a httpOnly cookie si se endurece).
- **Sanitización del carrito**: clamp a stock + validación de variantes en cada mutación y
  al rehidratar desde localStorage (no confía en el estado persistido).
- **Code-splitting por ruta y por vendor**: el bundle público no arrastra el admin.
- **Hidratación sincrónica de auth**: evita flicker/redirect en `/admin` al refrescar.
- **Tokens de diseño centralizados**: `COLOR_PALETTE`/`COLOR_MAP` + tema MUI; sin hex sueltos.
- **Estados de UI explícitos**: providers de carga inicial y de navegación, `Suspense` fallback.
- **Errores en lenguaje humano**: `errorMessage.ts` y normalizadores en los services.
- **Headers de seguridad en el edge** (`vercel.json`).

---

## 11. Notas / deuda conocida

- `@tanstack/react-query` aparece referenciado en el chunking de Vite pero **no figura como
  dependencia** en `package.json`; su uso real es parcial/ausente. Verificar antes de asumirlo.
- Carpeta `producDetail/` con typo (sin `t`); es el nombre real del directorio, respetarlo en imports.
- `fetchAllProducts` está `@deprecated` → usar `fetchProducts(false)`.
- `cancelMpOrder` es **best-effort**: loguea el fallo y no lo propaga (el sweep de expiración del
  backend limpia igual). `createOrder`, en cambio, **sí lanza** el error normalizado.
- Las rutas de skills en `CLAUDE.md` apuntan a `../../skill` (carpeta compartida fuera del repo).

---

## 12. Skills senior

El contrato de calidad senior (backend/frontend/QA/seguridad/UX/etc.) se carga automáticamente
vía [CLAUDE.md](CLAUDE.md), que importa los skills compartidos desde `../../skill/`.
Para frontend aplican principalmente: `00-role`, `02-frontend`, `03-testing-qa`, `04-security`,
`05-ux`, `06-restrictions`, `07-senior-rules`, `08-delivery-format`, `09-protocols`,
`10-documentation`, más `11-bug-hunter` y `12-judge-architect`.
