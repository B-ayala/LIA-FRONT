# Changelog

Todas las modificaciones notables se documentan en este archivo.
El formato sigue [Keep a Changelog](https://keepachangelog.com) y el proyecto adhiere a [SemVer](https://semver.org).

## [Unreleased]

### Added
- **Favicon y título dinámicos al cambiar de pestaña** (`hooks/useTabAwayMarketing.ts`,
  `config/tabAttention.ts`): mientras el usuario tiene la pestaña de LIA
  activa se muestra el favicon oficial (`public/favicons/favicon-lia.svg`);
  al salir de la pestaña, el favicon cambia a una variante con badge de
  atención (`favicon-lia-away.svg`) y el título muestra un mensaje breve de
  marketing elegido al azar (p. ej. "¡Volvé! 💕 | LIA"), estable mientras
  dure la ausencia. Al volver se restauran de inmediato el favicon y el
  título original de la página (el que corresponda a la ruta actual vía
  `react-helmet-async`), sin parpadeos. Deshabilitado en `/admin` y
  `/auth`. Un único listener de `visibilitychange` por montaje de `App`.
- **Toggle "comprador habilitado" en Usuarios (admin)**: nuevo botón por fila
  (`admin/pages/Users/Users.tsx`) para marcar/desmarcar a un usuario como
  comprador exclusivo, con popup de confirmación (`ConfirmationModal`) antes de
  aplicar el cambio. Mientras haya al menos un usuario marcado, se muestra un
  banner de aviso ("Modo de compra restringida activo...") y el resto de los
  usuarios recibe, al intentar pagar, el mensaje "Por el momento no es posible
  comprar. Sitio en mantenimiento, gracias por tu paciencia." (viene del
  backend, `PUT /api/users/:id` con `purchase_allowed_exclusive`).

### Changed
- **Reenviar confirmación de email y pedir reset de contraseña ahora pasan por
  el backend propio** (`POST /api/auth/resend-confirmation` y
  `/api/auth/forgot-password`) en vez de llamar a Supabase directo desde el
  navegador (`services/authService.ts`). El backend limita a **3 intentos
  cada 24hs por email**; al 4° pedido se muestra un mensaje pidiendo esperar
  en vez de seguir mandando emails.

### Fixed
- **Panel de Usuarios no mostraba nada en mobile (<768px)**: `Users.css` no
  restablecía el `display` de `.admin-table` para el layout de tarjetas, así
  que quedaba con el `display: none` base de `adminShared.css` y la tabla
  entera desaparecía en viewport móvil (en desktop sí se veía). Ahora
  `Users.css` fija `display: block/table` explícitamente en cada breakpoint,
  igual que hacen las demás páginas admin con tabla propia.
- **Panel de Usuarios no protegía al admin principal ("owner")**: `Users.tsx`
  ahora deshabilita "sacar admin" y "eliminar" para el usuario marcado como
  owner (`is_owner`, viene de `GET /api/users`) y muestra la insignia
  "Principal" junto a su rol. Antes el único chequeo era "no te saques el rol
  a vos mismo", que no protegía ninguna cuenta específica.

### Changed
- **Producto "Activo" sin stock ya no bloquea el guardado**: en `ProductModal`
  (alta y edición, mismo componente), guardar un producto "Activo" con stock 0
  (simple o por variantes) ya no muestra un error bloqueante. Ahora abre una
  confirmación ("Producto sin stock — ¿Deseás mostrarlo igualmente...?") con
  "Mostrar igualmente" / "Cancelar"; al confirmar, el producto se guarda
  "Activo" y queda visible en la tienda marcado "Sin stock" (no comprable). Si
  el usuario cancela, no se guarda nada (comportamiento anterior).
- **Catálogo, destacados y detalle ya no ocultan productos sin stock**:
  `Products.tsx` y `Home.tsx` dejaron de filtrar `stock > 0`; `ProductDetail`
  dejó de redirigir a "no disponible" por stock 0 (solo lo hace si el producto
  está inactivo/no existe). `ProductCard` agrega una insignia "Sin stock". La
  imposibilidad real de compra ya estaba cubierta en `ProductDetail` y
  `cartStore` (límite de stock por producto/variante), sin cambios ahí.

### QA — sesión 2026-07-01 (cobertura acumulada)
- **TC-130** ✅ Login con contraseña incorrecta → 401 "Credenciales inválidas"
- **TC-131** ✅ GET /api/users/auth/:userId → 200 con perfil completo
- **TC-120** ✅ Cotización de envío (API): CP válido → cost=4400; CP inválido → 400
- **TC-153** ✅ Insights low-stock: threshold inválido satura a [1,100] y usa default 5; sin 500
- **TC-167** ✅ Columna WhatsApp/origin presente en pending-payment insight
- **TC-169** ✅ POST /api/orders/transfer vía API: 201 + trigger decrementa stock
- **TC-170** ✅ Admin confirma transferencia vía UI → pagado; sin doble descuento de stock
- **TC-171** ✅ Admin cancela transferencia vía UI → cancelado; stock restaurado
- **Mis compras** ✅ API: GET /api/orders/user devuelve órdenes pagadas; UI bloqueada para admin (AdminRedirect)
- **HALL-006** ✅ Confirmado: "Agregar al carrito" truncado en sticky bar a 375px (pendiente fix)
- **HALL-007** ✅ Confirmado: /contact — Redes Sociales y Correo Electrónico sin CTA funcional (pendiente fix)
- Pendientes que requieren cuenta de usuario regular: TC-111, TC-120 UI, TC-163, TC-164, TC-152

### Removed
- `MODAL_GUIDE.md` y `REGISTRATION_IMPROVEMENTS.md`: describían un patrón de modales y un
  cambio de registro que ya no reflejan el código.

### Changed
- `DOCUMENTACION_FRONTEND.md` §4.2, §4.3, §6.1, §6.3, §6.4, §9 y §10 corregidos contra el
  código: la doc describía una **auth con JWT propio** (`/auth/login`, `/auth/me`, `/auth/refresh`)
  que no existe — la sesión la maneja Supabase Auth — y decía que la transferencia insertaba
  directo en `ventas` (va por `POST /orders/transfer` desde el fix de BUG-001). Se sumaron
  `shippingService`, `insightsService` y el endpoint `nudge`.
- `DOCUMENTACION_FRONTEND.md` §7.4: se elimina GitHub Pages como destino de despliegue (el
  workflow ya no existe); queda solo Vercel.
- `README.md` reescrito: era el template por defecto de Vite; ahora describe el proyecto, la
  puesta en marcha y el índice de documentación.
- `CLAUDE.md`: el contrato con el backend está alineado (ya no hay "endpoints que el backend no
  implementa").
- `ONBOARDING_TESTERS.md`: la base URL es `/`, no `/LIA` (quedó de la etapa GitHub Pages).
- `DOCUMENTACION_FRONTEND.md` §7.1: `VITE_API_URL_LOCAL` documenta que aplica a **todos** los
  entornos (no solo local) y que requiere el sufijo `/api`; el env se copia de `.env.example`
  a `.env.local`.
- `DOCUMENTACION_FRONTEND.md` §8 "Cómo levantar el proyecto": Node 22.x, puerto real y salto a
  5174, comando `test:e2e`, nuevas §8.1 (stack completo frontend + backend) y §8.2 (tabla de
  problemas frecuentes en local).

### Added
- **Temas / Tipografía — configuración avanzada de fuentes**: la sección "Temas" del panel admin pasa a llamarse "Temas / Tipografía" e incorpora un configurador completo de tipografía (familia, peso, espaciado entre letras, altura de línea). Los cambios se aplican en tiempo real sobre la sección del usuario, se persisten en localStorage por dispositivo y el admin puede publicarlos como predeterminado global desde Supabase. Las 8 familias disponibles (Poppins, Inter, Montserrat, Raleway, Nunito, Playfair Display, Cormorant Garamond, DM Sans) se cargan dinámicamente desde Google Fonts sin impacto en el bundle.
- **Guía de talles — selector de tipo**: el admin ahora elige entre *Indumentaria* (XS→XXL) y *Calzado* (35→42) antes de cargar medidas. Las columnas se pre-populan con los valores por defecto del tipo y son editables (agregar / quitar talle). Cambiar el tipo resetea la tabla automáticamente para evitar mezcla de sistemas de tallas.
- **Guía de talles — columnas propias**: la guía ya no depende de las opciones de la variante "Talle". Almacena su propio array `columns` en el campo `size_guide` de la DB; el componente `VariantTable` usa `sizeGuide.columns` con fallback a `sizes` (backward compat con productos existentes).

### Fixed
- **Routing — admin ve sección de usuario**: agregado guard `AdminRedirect` en las rutas públicas; un usuario con rol admin es redirigido automáticamente a `/admin` al intentar acceder a cualquier ruta pública (home, productos, detalle, checkout, etc.), tanto al navegar directo, al recargar el servidor de desarrollo como al presionar el botón atrás del navegador.
- **BUG-001 — Transferencia bancaria bloqueada por RLS**: `createOrder()` ahora llama a `POST /api/orders/transfer` en el backend Express (pool DB con service_role) en lugar de insertar directo a Supabase con anon key. Resuelve el bloqueo RLS que impedía a usuarios estándar crear órdenes por transferencia.
- **BUG-002 — Opción "Despachado" faltante en panel Despachos**: el filtro de estado ya incluye "Despachado"; el selector de cambio de estado muestra "Despachado" para envíos a domicilio o "Listo para retiro" para retiro en local (lógica condicional por shipping_method).
- **Admin — editar producto**: verificado que el modal de edición abre correctamente, persiste cambios y los refleja en tabla sin recargar.
- **Admin — eliminar producto**: dialog de confirmación presente; eliminar remueve el item de la lista inmediatamente.

### Known Issues
- **HALLAZGO-006** — Texto "Agregar al carrito" cortado ("Agregar al ca...") en la barra sticky inferior del detalle de producto en viewport 375px. Los dos botones no tienen suficiente espacio horizontal.
- **HALLAZGO-007** — `/contact`: Cards "Redes Sociales" y "Correo Electrónico" no tienen CTAs funcionales. Iconos de TikTok/Facebook son decorativos sin href; card de Correo no tiene botón mailto ni formulario.
- **HALLAZGO-008** — `AdminRedirect` bloquea al usuario admin del acceso a rutas públicas (/checkout, /about, /contact, /products) incluso via URL directa. El admin no puede probar el flujo de compra desde su misma cuenta.

### Removed
- **Asistente admin — sección "Recientes"**: se quitó el historial de consultas recientes del
  panel (chips bajo las acciones rápidas) por ser información redundante; las acciones ya están
  siempre visibles. Se eliminó también el estado, la persistencia en `localStorage`
  (`assistant:history`) y el CSS asociado.

### Changed
- **Asistente admin — labels de acciones más claros**: se renombraron las tres consultas que
  se confundían entre sí para hacer explícito el solapamiento. "Pendientes de pago" → "Pagos
  pendientes (todos)" (todo lo impago, cualquier medio); "Retiros por WhatsApp" → "Retiros
  impagos" (solo el subconjunto de retiro en local por WhatsApp sin pagar); "Retiros por
  confirmar" → "Retiros a entregar" (ya pagados, falta entrega). Solo cambian textos de UI;
  los endpoints y filtros del backend no se tocan.

### Added
- **Nudge post-WhatsApp en checkout por transferencia**: al volver a la pestaña tras abrir
  WhatsApp, aparece "¿Pudiste completar tu compra?" con tres respuestas: *Sí, ya envié el
  comprobante* / *Todavía no* / *No, cancelar mi pedido*. La respuesta se guarda en la nueva
  columna `ventas.origin` (`wa_confirmado` / `wa_sin_confirmar` / `wa_abandonado`); cancelar
  además libera el stock en el backend (`POST /api/orders/nudge`, solo dueño o admin). El
  asistente muestra esa señal en "Pedidos pendientes de pago" y "Retiros por WhatsApp sin
  confirmar" para distinguir los pendientes reales del ruido. Requiere correr la migración
  `BACK/lia-store/db/migrations/2026-06-16_add_origin_to_ventas.sql` en Supabase.
- **Asistente del panel admin**: widget flotante (FAB) disponible en todas las rutas
  `/admin/*` con acciones rápidas para consultar el negocio en segundos, sin navegar entre
  pantallas. **7 consultas**: stock bajo, ventas de hoy, pendientes de pago, retiros por
  WhatsApp sin confirmar, más vendidos, mayor crecimiento y retiros por confirmar (los envíos
  a domicilio quedan fuera de esta release). Cada resultado se muestra como tarjeta con
  métricas, filas, indicador de
  criticidad y acción sugerida (navegar / contactar por email). Incluye estados `loading`
  (skeleton) / `empty` / `error` (con reintento), historial de consultas recientes y
  favoritos (persistidos en `localStorage`), badge de alerta en el launcher y cierre con
  `Escape` / click afuera. Al ejecutar una consulta, el panel **desliza automáticamente al
  resultado**. Consume los endpoints solo-admin `GET /api/admin/insights/*` vía
  `services/insightsService.ts`. Registro de acciones data-driven en `assistantConfig.ts`
  (sumar una consulta = una entrada + endpoint).
  - **UI mobile-first**: las acciones rápidas van en **una sola columna** (compactas, menos
    cargado) y el panel ocupa casi toda la pantalla en teléfonos (≤480px).
  - **Retiros por WhatsApp**: se listan desde el momento en que se genera el pedido (sin
    esperar 15 min); se mantienen hasta que el admin confirma/cancela o el backend los
    expira a las 5 h.
- **Estados de carga (skeleton)** en contenido público que antes aparecía vacío/pop-in al
  navegar (el loader global solo cubre el primer arranque; el de navegación dura un tiempo
  fijo y no espera a los datos): productos destacados del Home (`ProductGrid` con prop
  `loading`), Footer y About. Nueva utilidad `.skeleton` compartida (shimmer) en `index.css`.
- **Empty state** en "Productos Destacados" del Home: si no hay destacados con stock, se
  muestra un mensaje + CTA "Ver todo el catálogo" en vez del título con la grilla vacía.
- Tema **Blanco y Negro** (monocromático) en el panel de Temas: paleta negro/blanco/grises
  al estilo del panel admin. Se suma a las estaciones existentes (data-driven: entrada en
  `SEASONS` + bloque `:root[data-season='mono']` en `seasons.css`), sin animación de fondo.
- Configuración de despliegue en **Vercel**: `vercel.json` declara `framework`,
  `buildCommand`, `outputDirectory` e `installCommand` explícitos (Vite → `dist`).
- `.env.example` documentando las variables requeridas (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL_LOCAL`) para cargar en Vercel.
- `confirmMpPayment` en `orderService` + llamada desde `CheckoutResult`: al volver
  de Mercado Pago con pago aprobado, el front llama a `POST /api/orders/mp-confirm`
  para que el backend verifique el pago contra MP y marque la venta como `pagado`.
- `extractCloudinaryPublicId` en `utils/cloudinary.ts`: deriva el `public_id`
  real (con carpeta, sin versión ni extensión) desde una URL de Cloudinary.
- Validación en el modal de productos: al intentar guardar un producto en estado
  **"Activo" con stock total 0** (manual o derivado de talles), se bloquea el guardado
  y se muestra un popup ("No se puede activar sin stock"). Evita el estado engañoso de
  un producto "Activo" que el catálogo público oculta por falta de stock. El estado
  "Inactivo" sigue permitiendo stock 0.
- Validación inline de **precio** en el modal de productos: precio vacío o ≤ 0
  marca error en el campo (antes sólo fallaba con un 400 genérico del backend al guardar).

### Changed
- **Categorías con la primera letra en mayúscula** automáticamente: nueva utilidad
  `normalizeCategory` (= `capitalizeFirst` + `cleanText`) aplicada al crear (`createCategory`),
  guardar (`buildProductBody`) y mostrar (catálogo, navbar, breadcrumbs, dropdown y admin). Las
  categorías cargadas en minúscula (ej. `"campera"`) se ven `"Campera"` sin tocar la base. La
  capitalización es neutra para el filtro (la coincidencia compara en minúsculas).
- Campo **Stock** del modal de productos unificado entre crear y editar: si el producto
  no trackea stock por talle, se muestra un input editable (antes, al **crear** sólo
  había una tarjeta derivada y no se podía cargar stock manual, naciendo el producto en 0).
- Vista previa de **Promociones** del modal ahora usa `getProductPricing` (la misma
  función que la tienda): muestra exactamente el precio tachado y final que verá el
  cliente, en lugar del `original_price` viejo/contradictorio de la base.
- La tabla de productos del admin muestra el **stock derivado de variantes** (suma de
  talles) cuando aplica, igual que el modal y la tienda pública, en vez de la columna
  `stock` que podía quedar desincronizada.
- `getAuthToken` devuelve un mensaje humano ("Tu sesión expiró. Volvé a iniciar sesión
  para continuar.") en lugar del técnico "Token no disponible" cuando no hay sesión.
- Tarjetas mobile de **Despachos** ahora usan el mismo `<select>` de estado que la tabla
  desktop (todas las opciones, incluida "Entregado"), en vez del badge + botón "Avanzar"
  que sólo permitía avanzar de a un paso y no llegaba a estados terminales. Unifica la
  forma de cambiar el estado de despacho entre mobile y desktop.

### Removed
- Código muerto del modal de productos: manejo de `autoInactive` / `missingFields` y el
  aviso "Producto guardado como inactivo". El backend nunca devolvía esos campos, así que
  la rama no se ejecutaba nunca.
- Código muerto en **Despachos** tras unificar el control de estado mobile: `handleAdvanceDispatch`,
  `nextDispatchStatus`, el chequeo `isTerminal` y el import `DISPATCH_STATUS_LABEL` que ya no se usan.
- **Calculadora de costo de envío** del detalle de producto (sección "Calcular costo de envío"):
  input de código postal + botón "Calcular" + resultado. Se eliminó el bloque junto con su estado
  (`postalCode`, `shippingCost`, `shippingDays`), la función `calculateShipping`, el import
  `API_BASE_URL` (ya no se usaba en el archivo) y los estilos asociados (`.shipping-calculator*`).

### Fixed
- **Nombres de producto con espacios sobrantes** (ej. `"sandalias "`, `"Campera "` cargados
  desde el admin) ahora se normalizan: nueva utilidad `cleanText` (trim + colapso de espacios)
  aplicada al leer el catálogo (`mapDbRowToProduct`, `searchProducts`) y en los mappers del
  admin, y al **guardar** (`buildProductBody` recorta el nombre, cortando el problema de raíz).
- **Categorías con espacios sobrantes** normalizadas en ambos lados del match del filtro de
  catálogo (árbol `fetchCategoriesTree` ↔ `productos.category`), para que la comparación sea
  siempre texto-limpio ↔ texto-limpio y ningún producto desaparezca de su categoría. Cubre
  lectura pública/admin, dropdown de categorías, escritura (`buildProductBody`, `createCategory`)
  y URLs manuales con espacios (`?category=Campera%20`) en `/products`.
- **Carrito persistente sin caducidad:** un ítem podía quedar meses en `localStorage`. Se le
  agregó un **TTL deslizante de 30 días** vía storage custom (`expiringStorage`): se restampa en
  cada cambio y al rehidratar descarta el carrito si la última actividad supera el límite (también
  limpia entradas con JSON corrupto).
- Pantallas de carga (inicial y de navegación) ahora **siguen el tema activo** en vez de
  quedar fijas en la paleta lila/magenta: usan las variables del tema (`--primary-color`,
  `--primary-accent`, `--primary-dark`, `--season-soft`, `--season-ribbon`, `--text-dark`)
  vía `color-mix`, con los colores previos como fallback. Así el loader matchea el tema
  elegido desde el panel (mono, invierno, etc.).
- Tabs del **modal de producto** ya no se recortan en mobile: la barra de pestañas pasa de
  scroll horizontal (con scrollbar oculto, última pestaña cortada y 2 pestañas inaccesibles)
  a **wrap** en dos filas, mostrando las 6 pestañas completas. En desktop sigue como sidebar vertical.
- Footer del **modal de producto** en pantallas ≤360px: los botones (flex:1 + `overflow:hidden`
  del shimmer) recortaban "Guardar producto". Ahora se apilan en vertical full-width y la
  etiqueta se ve completa.
- Al abrir el **menú mobile** desde el detalle de producto, la barra de acciones fija
  ("Comprar ahora / Agregar al carrito") ya no queda por encima del overlay: se bajó su
  `z-index` (200 → 90) por debajo del stacking context del navbar, así el overlay/slider la tapan.
- Botón flotante de **WhatsApp** ahora es responsive (CSS en vez de estilos inline): en mobile
  se achica (60→50px) y se pega a la esquina (bottom/right 40→18/16px) para no tapar contenido
  interactivo (p. ej. la primera opción de envío en checkout).
- Tarjetas de producto sin imagen ya no renderizan `<img src="">` (warning de React y
  re-descarga de página): nuevo helper `productImageSrc` que cae a un placeholder SVG.
- Panel de **Cloudinary** ("Consumo de tu plan") ya no muestra créditos negativos
  (ej. "-0.01"): se clampea el consumo y el porcentaje a 0 como mínimo.
- **Detalle de producto** inactivo/retirado/inexistente —y también **sin stock** (accesible
  solo por link directo; el catálogo ya lo oculta)— ya no redirige en silencio al catálogo:
  muestra un estado claro "Producto no disponible" con CTA "Volver al catálogo".
  Además `fetchProductById` usa `maybeSingle()`, eliminando los errores 406/PGRST116 que
  ese caso esperado generaba en consola.
- Filtros de los paneles **Ventas** y **Despachos** ya no se recortan ni se salen del
  viewport en tablet (≥640px) y desktop. Se quitó el prop `fullWidth` de los `Select`
  de filtro: el `MuiFormControl-fullWidth` (`width:100%`) ganaba en especificidad sobre
  el `width:auto` del layout y, con `flex-wrap:nowrap`, empujaba los filtros "Método de
  pago"/"Stock" (y "Estado de despacho") fuera de la pantalla, sin scroll para alcanzarlos.
  En mobile el comportamiento (apilado con wrap) se mantiene igual.
- Producto destacado/activo con stock a nivel producto (sin `stockByOption` por
  talle) ya no se calcula como stock 0 ni desaparece del home y del catálogo.
  `sanitizeVariant` deja de fabricar ceros cuando la variante de talle no trackea
  stock por opción, y `getSelectionStockLimit` cae al stock del producto. Antes el
  panel marcaba el producto como destacado ("X en home") pero el público nunca lo veía.
- El tema global publicado desde el panel de Temas ("Aplicar a todos los usuarios")
  ahora sí se aplica a los visitantes sin preferencia propia: `SeasonThemeProvider`
  lee `site_content.season_theme` al iniciar. La elección manual del usuario sigue
  teniendo prioridad y el tema global aplicado no se persiste, así futuros cambios
  del admin se reflejan en visitantes pasivos.
- Validación de URL (http/https) en TikTok/Facebook del editor de Configuración del
  sitio: evita guardar enlaces rotos o esquemas peligrosos en el footer público.
- Imagen de "Acerca de" ya no se renderiza con `src=""` durante la carga (eliminado
  el warning de React y la posible re-descarga de la página).

### Removed
- `.github/workflows/deploy.yml` (despliegue a GitHub Pages en cada push),
  reemplazado por el despliegue continuo de Vercel.

### Changed
- URL base del API centralizada: `API_BASE_URL` se exporta desde `utils/apiFetch.ts`
  y la consumen `orderService`, `userService`, `productService`, `Sales`,
  `CloudinaryManager` y `ProductDetail`. Antes estaba duplicada en 6 archivos y
  dos de ellos quedaban con `undefined/...` si faltaba `VITE_API_URL_LOCAL`.
- Flujo de cuentas alineado con el backend, todo vía **Supabase Auth**:
  registro (`signUp`), confirmación de email (`verifyOtp` / sesión del link),
  recuperación (`resetPasswordForEmail` + `updateUser` con sesión de recovery),
  cambio de contraseña (re-auth + `updateUser`), reenvío de confirmación (`resend`),
  logout (`signOut`) y `me` (`getUser`). Antes apuntaban a endpoints `/api/auth/*`
  inexistentes en el backend.
- Login alineado con el backend: ahora autentica vía **Supabase Auth**
  (`supabase.auth.signInWithPassword`) en lugar de un endpoint inexistente
  (`/auth/login`). El access token de Supabase se persiste y se envía como Bearer,
  que el backend acepta para autorizar. El rol/nombre se leen de `profiles`.
- `AuthModal` muestra el mensaje real del error de login (credenciales inválidas /
  email sin confirmar) en vez de un texto genérico.

### Fixed
- Admin Cloudinary: el panel de uso mostraba "casi todo tu límite (96%)" comparando
  la **cantidad de archivos** (24) contra los **25 créditos** del plan free (dos
  métricas distintas). Ahora la barra refleja el consumo real del plan
  (`credits.usage` / `credits.limit`), con texto amigable y la cantidad de imágenes
  como dato informativo, sin la alarma falsa.
- Admin Ventas: la tarjeta "Total ventas" contaba solo las pagadas (mismo valor
  que "Pagadas") y no cuadraba con la lista; ahora cuenta todas las ventas.
- Checkout MP: si el backend no devuelve `init_point`, ahora se muestra un error
  claro en lugar de redirigir a `about:undefined`.
- `createOrder` (transferencia): los errores de inserción en `ventas` ya no se
  pierden en silencio (Supabase devuelve `{ error }`, no lanza; el `try/catch`
  anterior era código muerto). Se loguean para diagnóstico.
- `cancelMpOrder`: el fallo de cancelación queda registrado en consola en lugar
  de desaparecer sin rastro.
- `userService` (admin): los errores con cuerpo no-JSON ahora informan el status
  HTTP real en lugar de un mensaje genérico que ocultaba la causa.
- `publicId` de productos: se deriva con `extractCloudinaryPublicId`; antes
  (`url.split('/').pop()`) perdía la carpeta y conservaba la extensión, por lo
  que el cleanup de imágenes en Cloudinary al borrar productos fallaba siempre.
- `CloudinaryManager` ya no rompe la página (white-screen) cuando el backend
  devuelve una respuesta de imágenes sin `resources`: se normaliza a `[]` y se
  muestra el estado vacío/error en lugar del `TypeError` en `images.filter`.
- Build roto por variable sin usar (`setErrorMessage`) en `ResetPassword.tsx`
  (`tsc` TS6133). Ahora `tsc -b && vite build` pasa en verde.
- Lectura de perfil en login/`me` usa `maybeSingle` en vez de `single`: si todavía
  no existe la fila en `profiles`, devuelve `null` (rol `user`) en lugar de tirar un 406.

### Removed
- Función muerta `getCloudinarySignature` en `productService.ts` (nunca se usaba;
  el firmado real se hace inline en `CloudinaryManager` con Bearer token).
- `console.log`/`console.error` de debug en el handler de login de `AuthModal`.
