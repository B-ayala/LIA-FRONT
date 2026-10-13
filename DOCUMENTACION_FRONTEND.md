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
│   ├── authTokenStore.ts       # sesión SOLO en memoria (access token + usuario) y purga de claves viejas de localStorage
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
│       ├── producDetail/ProductDetail.tsx   # (sic) carga del producto + estados no disponible/skeleton
│       ├── producDetail/ProductDetailView.tsx  # detalle presentacional (lo reutiliza la vista previa admin)
│       ├── checkout/Checkout.tsx      # container: gates de sesión + layout (stepper, pasos, resumen)
│       │   ├── CheckoutResult.tsx      # vuelta de Mercado Pago
│       │   ├── checkoutUtils.ts        # costos de envío, totales, payload de ítems, mensaje de WhatsApp
│       │   ├── hooks/                  # useCheckoutFlow, useCheckoutStep (?paso=pago), useCheckoutPayment,
│       │   │                           #   useTransferNudge, useCheckoutItems
│       │   └── components/             # CheckoutStepper, CheckoutStepContent, DeliveryStep, PaymentStep,
│       │                               #   OrderSummaryCard, OptionList, PillInput, PrimaryPillButton,
│       │                               #   VariantTags, MpRedirectNotice
│       ├── about/About.tsx
│       ├── contact/Contact.tsx
│       └── auth/EmailConfirmation.tsx + ResetPassword.tsx
│
└── admin/                      # mundo admin
    ├── layout/                 # AdminLayout, AdminHeader, AdminSidebar
    ├── routes/AdminProtectedRoute.tsx   # guard por rol admin
    ├── store/adminStore.ts     # estado del panel (products, users, carousel, about, footer)
    ├── styles/adminShared.css  # estilos compartidos del admin
    ├── components/             # CarouselManager, BannerEditor, CloudinaryImagePicker, CloudinaryStorageUsage,
    │                           #   FeaturedProductsManager, ProductGallery, ProductModal, ProductTable
    └── pages/                  # Dashboard, Products, ProductPreview, Users, Sales, Dispatches, AboutEditor,
                                #   FooterEditor, HomeManager, CloudinaryManager, ThemesManager
```

> Convención: cada componente vive en su carpeta con su `.tsx` y su `.css` colindante.
> Los estilos propios de un componente se aíslan en ese `.css`; los colores/tokens globales
> se reutilizan desde `index.css`, `utils/constants.ts` y el tema MUI (no hardcodear hex en componentes).
>
> **Paleta (`index.css` `:root`).** Hay dos familias de tokens:
> - **Tematizables por el admin** (Temas → `site_content.season_theme`, aplicados por
>   `SeasonThemeProvider` vía `data-season` + `seasons.css` o variables inline del tema personalizado):
>   `--primary-*`, `--bg-light`, `--brand-green`, `--button-dark*`, `--season-*`, `--shadow-primary*`,
>   `--shadow-2xl`. **No se pisan** desde componentes: el tema publicado manda.
> - **No tematizables (ink)**: azul petróleo `--color-ink` (#0b2a3a, 14.9:1 sobre blanco) para texto,
>   títulos y CTA no tematizados; `--color-ink-hover`, `--color-ink-muted` (6.8:1), `--color-ink-subtle`
>   (5.0:1), `--color-link` (7.4:1), `--color-focus`, `--color-border-soft` (separadores),
>   `--color-border-input` (3.3:1, borde de inputs), superficies (`--color-surface*`), estados
>   (`--color-danger*`, `--color-success-ink`, `--color-warning-ink`), `--shadow-soft` y `--space-1…7`.
>   `--text-dark`/`--text-light` son alias de `--color-ink`/`--color-ink-muted`, así todo lo que ya los
>   usaba (incluido `body`) toma el azul petróleo.
> - El color "Texto" (`textDark`) de la paleta de temas hoy solo se usa en la vista previa del
>   ThemesManager; no se inyecta como variable CSS en el sitio.

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
  - Arranca vacío: la sesión vive solo en memoria. `initializeAuth()` la recupera con la cookie
    httpOnly del refresh token (`POST /api/auth/refresh`) y marca `authInitialized`;
    `AdminProtectedRoute` y el checkout esperan ese flag antes de decidir.
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

### 6.1 Autenticación (backend `/api/auth/*` + Supabase Auth)
Login, refresh y logout pasan por el backend Express; el **refresh token vive en una cookie
httpOnly** (JS nunca lo lee) y el **access token solo en memoria** ([authTokenStore.ts](src/utils/authTokenStore.ts)).
Nada de tokens en `localStorage`/`sessionStorage`. Todo pasa por `services/authService.ts`.

1. **Login** (`AuthModal` → `authStore.login` → `authService.login`): `POST /api/auth/login` con
   `credentials: 'include'`. El backend aplica rate limit y bloqueo por fuerza bruta, valida contra
   Supabase y responde usuario + access token; setea la cookie del refresh token.
2. **Sesión al recargar**: `authStore.initializeAuth` → `POST /api/auth/refresh` (cookie) devuelve un
   access token nuevo. Sin cookie válida, la app arranca sin sesión.
3. **Refresh automático**: [sessionRefresh.ts](src/services/sessionRefresh.ts) renueva 60 s antes del
   vencimiento, con una sola request en vuelo. `apiFetch` y el cliente de Supabase
   ([supabaseClient.ts](src/config/supabaseClient.ts), que inyecta el token en las consultas `/rest/v1/`
   para que RLS vea al usuario) piden el token a ese módulo. Ante un `401` `apiFetch` renueva y
   **reintenta una vez**; si la sesión venció de verdad → limpia y emite `auth:logout`. Un backend
   caído o lento no cierra la sesión.
4. **Registro**: `supabase.auth.signUp` con confirmación de email; el link vuelve a
   `EmailConfirmation.tsx`, que valida con `supabase.auth.verifyOtp`. Reenvío con
   `supabase.auth.resend`.
5. **Recuperación**: `supabase.auth.resetPasswordForEmail` → link → `ResetPassword.tsx` →
   `supabase.auth.updateUser`; al terminar se cierra sesión y se fuerza re-login.
6. **Cambio de password** (logueado): re-autentica con la password actual por `/api/auth/login`
   (con su bloqueo por fuerza bruta), cambia la clave con `PUT /auth/v1/user` y cierra sesión.
7. **Captcha (Cloudflare Turnstile)**: si `VITE_TURNSTILE_SITE_KEY` está definida, login, registro,
   recuperación, reenvío de confirmación y cambio de password muestran el widget y mandan el
   `captchaToken` (el backend lo reenvía a Supabase, que lo valida si CAPTCHA está activo en su panel).
   Sin la variable queda apagado.

> El backend usa estos tokens en `authMiddleware` (los verifica contra Supabase). Detalle en
> `../../BACK/lia-store/DOCUMENTACION_BACKEND.md` §6.

### 6.2 Catálogo
- `Home` / `Products` leen de Supabase (`fetchFeaturedProducts`, `fetchProducts`).
- `ProductDetail` lee el producto (`fetchProductById`) y delega el render en `ProductDetailView`.
- Admin: en `ProductModal` "Ver vista previa" no guarda; navega a `/admin/products/preview` con el
  borrador (router state), que muestra `ProductGrid` + `ProductDetailView` (`preview`) y persiste
  (`createProduct`/`updateProduct`) recién en "Confirmar".
- `NavBar` usa `fetchCategories` / `searchProducts` (búsqueda con `ilike` sobre `productos`).

### 6.3 Carrito y checkout
1. El usuario agrega al carrito (`cartStore.addItem`) o va a "compra directa" (setea `item`).
2. Cada unidad puede tener variantes (`PurchaseVariantModal`); se validan contra el producto.
3. `/checkout` es un flujo de 3 pasos con stepper (Carrito ✓ → Entrega → Pago) y dos vistas reales
   sincronizadas con la URL: **Entrega** (`/checkout`) y **Pago** (`/checkout?paso=pago`). El botón
   atrás del navegador vuelve de Pago a Entrega; "Modificar" hace lo mismo sin duplicar historial.
   Entrar por URL a `?paso=pago` sin datos válidos reemplaza la entrada por Entrega. El estado
   (nombre, entrega, método de pago) vive en el container, así que ir y volver no pierde datos. Al
   cambiar de paso el foco va al `h2` del paso y un `aria-live` anuncia "Paso N de 3".
   - **Entrega**: "Datos de contacto" con el e-mail de la sesión en solo lectura (es la clave de
     propiedad de la venta, ver abajo) y, solo si el perfil no tiene nombre, un campo "Nombre y
     apellido". Forma de entrega: **Retiro en local** (preseleccionada, costo 0) o **Correo
     Argentino** ($4.400, deshabilitada con motivo visible). No hay envío a domicilio, así que no se
     pide dirección. "Continuar para el pago" solo se deshabilita por precio inválido, falta de
     nombre o de e-mail, mostrando el motivo.
   - **Pago**: repaso de contacto/entrega + método de pago:
     - **Transferencia**: `orderService.createOrder` → `POST /orders/transfer`. La escritura va por
       el backend a propósito: insertar directo en `ventas` con la anon key lo bloquea RLS
       (BUG-001). La ventana de WhatsApp se abre vacía **en el click** (`whatsAppWindow.ts`, con
       `opener = null`) y recibe la URL al crear la orden: Safari iOS/Firefox bloquean `window.open`
       después de un `await`. Creada la orden, el CTA se reemplaza por el panel "Pedido creado"
       (`TransferCreatedPanel`: "Abrir WhatsApp" + "Volver a la tienda") y la `Idempotency-Key` se
       conserva hasta vaciar el carrito, así un segundo click nunca crea otra venta. Se arma el nudge
       al volver a la pestaña.
     - **Mercado Pago**: aviso de 15 minutos (`MpRedirectNotice`, `role="dialog"`, foco atrapado,
       foco inicial en "Volver", Escape cierra) → `orderService.createMpPreference` →
       `POST /orders/mp-preference`, recibe `init_point` + `order_ids`. Antes de redirigir se guarda
       la compra en `sessionStorage` (`mpPendingPurchase.ts`: `mp_order_ids`, `mp_deadline`,
       `mp_owner` = e-mail del dueño, `mp_last_order` con `productId` por línea). Si la redirección
       no ocurre en 15 s se rehabilita el CTA (misma key: el backend devuelve la misma preferencia).
     - **Liberación de la compra MP anterior** (`useReleaseAbandonedMpPayment`, en `CheckoutSession`):
       si al montar `/checkout` (o al restaurarlo desde bfcache, evento `pageshow` con `persisted`)
       hay una compra guardada del mismo usuario, se llama `cancelMpOrders` →
       `POST /orders/mp-cancel { orderIds }` y se ESPERA el `outcome`. Estados: `releasing` (pago
       bloqueado, "Liberando tu reserva anterior…", tope de 15 s) → `released` (se olvida la compra;
       banner "Se venció el tiempo para pagar…" solo si además había vencido el plazo), `held` (pago
       en curso: aviso + pago bloqueado + "Verificar de nuevo"), `paid` (aviso "¡Tu pago ya fue
       acreditado!" + Mis compras; se quitan del carrito solo esos productos, `mpSettlement.ts`) o
       `error` (aviso con "Reintentar"; no bloquea). Una compra guardada con otro `mp_owner` no se toca.
     - **Precio y stock frescos** (`useCartFreshness`): al montar se leen los productos del pedido
       sin caché (`fetchActiveProductsByIds`) y se concilian con `cartStore.syncProducts` (no descarta
       líneas). Precio cambiado → aviso; talle agotado/inexistente o producto inactivo → línea
       resaltada en el resumen y en `CheckoutItemIssues` con "Cambiar talle" / "Quitar del carrito"
       ("Ver producto" en compra directa). El pago se bloquea mientras carga o con líneas inválidas;
       si la lectura falla se avisa y se deja seguir (el backend revalida).
     - Errores del backend: los de stock (`OUT_OF_STOCK`, `SIZE_OUT_OF_STOCK`, `SIZE_UNAVAILABLE`,
       `SIZE_REQUIRED`, `INVALID_VARIANT`, con `productId`/`size`) llegan como `CheckoutStockError`:
       se resalta la línea y se relee el stock. Red caída/timeout (20 s en la creación de órdenes) →
       "No pudimos conectarnos. Revisá tu conexión y reintentá." (`extractErrorMessage`).
     - Ambos envían `Idempotency-Key` (una por intento; huella = método, ítems, envío, costo, total,
       nombre y e-mail) y tienen guard anti doble click. Los errores se muestran con `role="alert"`.
     - Montos: precios redondeados a centavos (`roundToCents`) y `formatAmount` con máximo 2
       decimales. El backend no devuelve el total cobrado: el total de WhatsApp y de `mp_last_order`
       sale del front (con precios recién releídos).
   - **Resumen** (`OrderSummaryCard`): miniatura, nombre × cantidad, variantes (`VariantTags`),
     precio, subtotal, envío y total. Desktop (≥992px): columna derecha sticky. Mobile: colapsable
     con el total visible en el encabezado.
   - **E-mail de contacto vs dueño**: `buyerEmail` siempre es el e-mail de la sesión. El backend lo
     guarda en `ventas.buyer_email` y lo usa para "Mis compras" (`GET /orders/user?email=`), para
     autorizar `POST /orders/mp-cancel` y el nudge. No existe un campo de e-mail de contacto
     separado; hacerlo editable requiere un cambio de contrato y schema en el backend.
4. `CheckoutResult` (`useMpResultSettlement` + `resultContent.tsx`): si MP dice `approved` muestra
   "Confirmando tu pago…" mientras corre `POST /orders/mp-confirm` (el backend lo verifica contra la
   API de MP); si falla, "Recibimos tu pago y lo estamos verificando". `pending` → "Pago en proceso"
   con acceso a Mis compras. En ambos se quitan del carrito SOLO los productos de `mp_last_order`
   (si la compra es del usuario actual); sin ese detalle (recarga) el carrito no se toca. `failure`
   → `POST /orders/mp-cancel` esperando el `outcome` (`held`/`paid` cambian el mensaje; `error`
   ofrece "Reintentar").
5. El carrito se sincroniza entre pestañas (`useCartTabSync`, montado en `App`): evento `storage`
   sobre la key `damiana-bella-cart` → `useCartStore.persist.rehydrate()` (sin eco entre pestañas).
6. `POST /orders/nudge` registra el recordatorio al usuario con el pago pendiente.
7. `MyPurchasesModal` lista compras por email vía `GET /orders/user?email=…` (el backend
   bypassa RLS de Supabase y valida que seas el dueño o admin); trae las pagadas y las transferencias
   con comprobante avisado en el nudge. `PaymentStatusNotice` muestra "Verificando tu comprobante"
   (`pendiente`) o "Pedido cancelado" / "Reserva vencida" (`cancelado` / `expirado`); solo con `pagado`
   muestra el
   `DispatchTracker` con el `dispatch_status` que el admin cambia en Despachos (`null` = pendiente;
   el 3er paso es "Listo para retiro" si el envío es `local`, "Despachado" en otro caso). Mientras
   el modal está abierto se re-consulta cada 20 s (polling silencioso, pausado con la pestaña oculta;
   no hay Realtime porque la lectura va por el backend, no por Supabase).

### 6.4 Admin
- `Products`: CRUD vía API (`/products`), imágenes vía Cloudinary firmado. Al abrir un producto
  para editar se relee sin caché (`fetchProductById`, `mapAdminProductRow`) y el guardado (en la
  vista previa) envía `expectedUpdatedAt` = `updated_at` crudo de la base; ante
  `409 PRODUCT_CHANGED` se relee el producto, se conserva el borrador salvo el stock por talle
  (`rebaseDraftOnFresh`) y se pide confirmar de nuevo. Productos sin stock por talle: al editar no
  se envía `stock` (el formulario lo muestra en solo lectura); al crear se envía explícito.
- `Sales` (`salesQueries.ts`, `SaleStatusCell`, `useSaleActions`): lee `ventas` de Supabase
  (incluye `oversold` y `review_reason`; si la columna falta, error con "Reintentar"). Estado
  efectivo: MP `pendiente` <15 min = "Pendiente", 15 min–24 h = "Pago en proceso", >24 h =
  "Expirado"; transferencia >5 h = "Expirado" (filtros y contador "Pendientes" usan la misma regla).
  Etiquetas "Sin stock: reembolsar" y "Revisar: …" según `review_reason`. Acciones admin con
  confirmación y anti doble click: confirmar/cancelar transferencia (`PATCH
  /orders/:id/confirm-transfer` y `/cancel-transfer`) y "Confirmar pago tardío" para transferencias
  `expirado` (`PATCH /orders/:id/confirm-late-transfer`, avisa si quedó `oversold`). El resultado
  se muestra con `ConfirmationModal` (no hay sistema global de toasts).
- `Asistente`: analítica vía `GET /admin/insights/*` (`insightsService.ts`).
- `Dispatches`: gestiona estado de despacho sobre `ventas`.
- `Users`: lista/edita/borra usuarios vía `/users` (solo admin).
- `HomeManager` / `AboutEditor` / `FooterEditor` / `ThemesManager`: editan contenido en
  `site_content` y `carousel_images`.
- `CarouselManager` + `BannerEditor` (carrusel del home): además de fotos, el admin crea **banners
  editables** por dispositivo. El diseño (`BannerDesign`: fondo + lista de elementos `text` /
  `button` / `image` / `line` con `x`,`y`,`w` en % del lienzo, giro y estilo) se guarda en
  `carousel_images.design` y se sanea al leerlo (`parseBannerDesign`: colores hex, links solo
  `/ruta` o `https://`, fotos solo `https://`, números acotados, máx. 30 elementos). El mismo
  `BannerCanvas` (`components/common/`) dibuja el banner en el carrusel público y en el editor
  (modo `editing`: arrastre por pointer events, resize, teclado); los textos usan `cqw`, así que
  escalan con el ancho. El editor es un chunk lazy con deshacer/rehacer (`useBannerHistory`).
  `groupBySlide` (`utils/carouselSlides.ts`) agrupa las fotos según el layout y deja cada banner
  como slide propio; lo usan el carrusel y el admin para numerar igual.
- **Color del menú por slide**: el navbar es transparente sobre el carrusel en el Home y su color
  de texto sale del slide visible. `Carousel` publica `navbarColor` del slide actual en
  `store/navbarToneStore.ts` y `NavBar` lo aplica (`slideColor ?? navbarStyle.overlayTextColor`;
  el estado sólido tras hacer scroll no cambia). En collage vale el de la primera foto del slide.
  El admin lo edita con `NavbarColorDialog` (botón "Menú" de cada slide) o desde el editor de
  banners; `utils/navbarColor.ts` (contraste WCAG, color legible) y `utils/sampleTopStrip.ts`
  (promedio de la franja superior de la foto; requiere CORS de Cloudinary, si falla se elige a mano).
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
| `carousel_images` | read/write | filtrable por `device_type` (`desktop`/`mobile`), `is_active`, `order`. `kind` = `image` (usa `url`) o `banner` (usa `design` jsonb, `url` = `''`). `navbar_color` (hex o NULL) = color del menú sobre ese slide. |
| `site_content` | read/write/delete | clave-valor (`key`/`value` JSON) para about, footer, banner, temas. Requiere UNIQUE en `key`. |
| `ventas` | solo lectura (panel admin) | las altas van por el backend (RLS bloquea el insert con anon key — BUG-001); también la escribe el backend (MP, stock, despachos). Campos: `buyer_*`, `product_*`, `quantity`, `unit_price`, `total_price`, `units_config`, `payment_method`, `payment_status`, `shipping_method`, `dispatch_status`. |
| `contact_messages` | insert | mensajes del formulario de contacto. |

> `profiles` (roles/usuarios) y la escritura sensible de `productos`/`ventas` se manejan
> **desde el backend** con la `service_role` key, no desde el front.

---

## 10. Patrones y buenas prácticas detectadas

- **Frontera de datos en `services/`**: los componentes no hablan directo con Supabase/fetch.
- **`apiFetch` centraliza auth**: Bearer token en memoria, refresh con cola anti-stampede vía
  cookie httpOnly, reintento único y evento global de logout forzado.
- **Sin tokens en el almacenamiento del navegador**: un XSS no puede leer la sesión. La CSP
  (en `vercel.json`) es la segunda capa.
- **Sanitización del carrito**: clamp a stock + validación de variantes en cada mutación y
  al rehidratar desde localStorage (no confía en el estado persistido).
- **Code-splitting por ruta y por vendor**: el bundle público no arrastra el admin.
- **`authInitialized`**: las rutas que dependen de la sesión esperan a que se recupere, para no rebotar en `/admin` al refrescar.
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
- `cancelMpOrders` nunca lanza: devuelve `'released' | 'held' | 'paid' | 'error'` (red, timeout o
  4xx/5xx = `'error'`, que la UI muestra con "Reintentar"). `createOrder`/`createMpPreference`, en
  cambio, **sí lanzan** (`CheckoutStockError` para errores de stock con `productId`).
- No existe un sistema global de toasts/confirm: el admin de Ventas usa `ConfirmationModal`
  (`components/common/Modal`) para el resultado de sus acciones.
- Las rutas de skills en `CLAUDE.md` apuntan a `../../skill` (carpeta compartida fuera del repo).

---

## 12. Skills senior

El contrato de calidad senior (backend/frontend/QA/seguridad/UX/etc.) se carga automáticamente
vía [CLAUDE.md](CLAUDE.md), que importa los skills compartidos desde `../../skill/`.
Para frontend aplican principalmente: `00-role`, `02-frontend`, `03-testing-qa`, `04-security`,
`05-ux`, `06-restrictions`, `07-senior-rules`, `08-delivery-format`, `09-protocols`,
`10-documentation`, más `11-bug-hunter` y `12-judge-architect`.
