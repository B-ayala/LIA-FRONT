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
| `authService` | — | `/auth/*` (JWT) |
| `userService` | — | `/users` (admin) + delega en `authService` |
| `productService` | read `productos`, `categories`, `carousel_images` | write `/products`, `/cloudinary/*` |
| `orderService` | insert `ventas` (transferencia) | `/orders/*` (Mercado Pago, compras, cancelaciones) |
| `siteContentService` | `site_content` (read/write) | — |

### 4.3 Estado global (Zustand)
- **`authStore`** — sesión. Distingue dos flags:
  - `currentUser`: cualquier usuario autenticado (admin o user).
  - `isAuthenticated`: **solo admin validado** (es el gate de `AdminProtectedRoute`).
  - Hidrata sincrónicamente desde `localStorage` en el primer render (evita que `/admin` + F5
    redirija por un render temprano con sesión vacía). `initializeAuth()` valida contra
    `/auth/me`; ante error de red transitorio mantiene el estado hidratado en vez de expulsar
    al admin.
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

### 6.1 Autenticación (JWT propio, no Supabase Auth)
1. **Login** (`AuthModal` → `authStore.login` → `authService.login`): `POST /auth/login`.
   El backend devuelve `{ data: user, accessToken, refreshToken }`; se persisten en
   `tokenStorage` (localStorage). Si `role === 'admin'` se setea `isAuthenticated`.
2. **Sesión persistente**: al cargar la app, `authStore` hidrata desde localStorage y luego
   `initializeAuth()` llama `GET /auth/me`.
3. **Refresh automático**: `apiFetch` detecta `401` con `code: TOKEN_EXPIRED`, llama a
   `POST /auth/refresh` (con cola para no disparar N refreshes en paralelo), guarda los nuevos
   tokens y reintenta la request original **una vez**. Si el refresh falla → `auth:logout`.
4. **Registro** (`POST /auth/register`): requiere confirmación de email
   (`/auth/confirm?token=…` → `EmailConfirmation.tsx` → `POST /auth/confirm-email`).
5. **Recuperación**: `forgot-password` → email con token → `/auth/reset-password?token=…`
   → `ResetPassword.tsx` → `POST /auth/reset-password`.
6. **Cambio de password** (logueado): `POST /auth/change-password`; el backend revoca todos
   los refresh tokens, el front limpia sesión y fuerza re-login.

### 6.2 Catálogo
- `Home` / `Products` leen de Supabase (`fetchFeaturedProducts`, `fetchProducts`).
- `ProductDetail` lee el producto (`fetchProductById`) y, si no es envío gratis, consulta
  `GET /shipping?postalCode=…` para costo/plazo de envío.
- `NavBar` usa `fetchCategories` / `searchProducts` (búsqueda con `ilike` sobre `productos`).

### 6.3 Carrito y checkout
1. El usuario agrega al carrito (`cartStore.addItem`) o va a "compra directa" (setea `item`).
2. Cada unidad puede tener variantes (`PurchaseVariantModal`); se validan contra el producto.
3. En `Checkout` se elige método de pago:
   - **Transferencia**: `orderService.createOrder` inserta filas en `ventas` (Supabase) con
     `payment_status: 'pendiente'`.
   - **Mercado Pago**: `orderService.createMpPreference` → `POST /orders/mp-preference`,
     recibe `init_point` (redirección a MP) + `order_ids`. Si el usuario vuelve sin pagar,
     `cancelMpOrder` → `POST /orders/:id/cancel` (el backend restaura stock; hay cron de respaldo).
4. `CheckoutResult` muestra el resultado del pago.
5. `MyPurchasesModal` lista compras por email vía `GET /orders/user?email=…` (el backend
   bypassa RLS de Supabase).

### 6.4 Admin
- `Products`: CRUD vía API (`/products`), imágenes vía Cloudinary firmado.
- `Sales`: lee `ventas` de Supabase; confirma/cancela transferencias vía
  `POST /orders/:id/confirm-transfer` y `/orders/:id/cancel-transfer`.
- `Dispatches`: gestiona estado de despacho sobre `ventas`.
- `Users`: lista/edita/borra usuarios vía `/users` (solo admin).
- `HomeManager` / `AboutEditor` / `FooterEditor` / `ThemesManager`: editan contenido en
  `site_content` y `carousel_images`.
- `CloudinaryManager`: explora carpetas/imágenes, uso de almacenamiento, sube/borra.

---

## 7. Configuración

### 7.1 Variables de entorno (Vite — prefijo `VITE_`)
Crear un `.env` (o `.env.local`) en la raíz del repo. **Nunca commitearlo.**

| Variable | Requerida | Descripción |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | URL del proyecto Supabase. Sin ella, `supabaseClient` lanza error en el arranque. |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Anon key (pública) de Supabase. |
| `VITE_API_URL_LOCAL` | ✅ (recomendada) | Base URL de la API Express. Si falta, cae a `http://localhost:3000/api`. Soporta túneles ngrok (agrega header `ngrok-skip-browser-warning` y hace fallback a localhost ante error de red). |

> `import.meta.env.BASE_URL` se usa para resolver assets según el `base` de despliegue.

### 7.2 Build / chunking (`vite.config.ts`)
- Plugins: `react()` + `imagetools()`.
- `manualChunks` separa vendors: `mui`, `router`, `supabase`, `query`, `motion`, `icons`,
  `react-vendor`, `vendor`. Mejora el caching y evita un único bundle gigante.

### 7.3 TypeScript
- `tsconfig.json` (referencias) → `tsconfig.app.json` (app) + `tsconfig.node.json` (config de build).
- `npm run build` corre `tsc -b` antes de `vite build` (el build falla si hay errores de tipos).

### 7.4 Despliegue
- **GitHub Pages**: `.github/workflows/deploy.yml` buildea en push a `main` y publica `dist/`.
- **Vercel**: `vercel.json` define headers de seguridad (`X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`) y rewrite SPA
  (`/(.*) → /index.html`). Script `npm run deploy` (`vercel --prod`).

---

## 8. Cómo levantar el proyecto

```bash
# 1. Instalar dependencias (Node 22.x)
npm install

# 2. Crear .env en la raíz con:
#    VITE_SUPABASE_URL=...
#    VITE_SUPABASE_ANON_KEY=...
#    VITE_API_URL_LOCAL=http://localhost:3000/api   # o el túnel ngrok del backend

# 3. Levantar en desarrollo (HMR)
npm run dev

# 4. Otros comandos
npm run build     # tsc -b && vite build  → genera dist/
npm run preview   # sirve el build de producción localmente
npm run lint      # eslint .
npm run deploy    # build + vercel --prod
```

> Para que la app funcione completa necesitás también el **backend Express** corriendo
> (auth, productos, pagos, Cloudinary, envíos) y un proyecto **Supabase** con las tablas
> listadas abajo. Ver `../../BACK/lia-store/DOCUMENTACION_BACKEND.md`.

---

## 9. Modelo de datos (Supabase, visto desde el front)

Tablas que el frontend toca directamente con la `anon key`:

| Tabla | Operaciones desde el front | Notas |
|---|---|---|
| `productos` | read (público: `status='active'`; admin: todos) | mapeada a `Product` por `mapDbRowToProduct`. Campos snake_case: `image_url`, `original_price`, `free_shipping`, `return_policy`, `featured`, `status`. |
| `categories` | read/write | árbol por `parent_id` + `level`; con fallback a categorías derivadas de `productos`. |
| `carousel_images` | read/write | filtrable por `device_type` (`desktop`/`mobile`), `is_active`, `order`. |
| `site_content` | read/write/delete | clave-valor (`key`/`value` JSON) para about, footer, banner, temas. Requiere UNIQUE en `key`. |
| `ventas` | insert (transferencia) | escrita también por el backend (MP, stock, despachos). Campos: `buyer_*`, `product_*`, `quantity`, `unit_price`, `total_price`, `units_config`, `payment_method`, `payment_status`, `shipping_method`, `dispatch_status`. |
| `contact_messages` | insert | mensajes del formulario de contacto. |

> `profiles` (roles/usuarios) y la escritura sensible de `productos`/`ventas` se manejan
> **desde el backend** con la `service_role` key, no desde el front.

---

## 10. Patrones y buenas prácticas detectadas

- **Frontera de datos en `services/`**: los componentes no hablan directo con Supabase/fetch.
- **`apiFetch` centraliza auth**: Bearer token automático, refresh con cola anti-stampede,
  reintento único, fallback ngrok→localhost, y evento global de logout forzado.
- **Tokens cortos + refresh rotativo**: access ~15 min; mitigación de XSS documentada en
  `tokenStorage.ts` (con plan de migración a httpOnly cookie si se endurece).
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
- Algunas inserciones (`createOrder`, `cancelMpOrder`) son **best-effort** y se tragan errores
  a propósito para no bloquear el flujo de pago; tenerlo en cuenta al depurar ventas.
- Las rutas de skills en `CLAUDE.md` apuntan a `../../skill` (carpeta compartida fuera del repo).

---

## 12. Skills senior

El contrato de calidad senior (backend/frontend/QA/seguridad/UX/etc.) se carga automáticamente
vía [CLAUDE.md](CLAUDE.md), que importa los skills compartidos desde `../../skill/`.
Para frontend aplican principalmente: `00-role`, `02-frontend`, `03-testing-qa`, `04-security`,
`05-ux`, `06-restrictions`, `07-senior-rules`, `08-delivery-format`, `09-protocols`,
`10-documentation`, más `11-bug-hunter` y `12-judge-architect`.
