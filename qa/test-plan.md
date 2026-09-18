# Plan de pruebas QA — Panel "Inicio" (Admin) vs experiencia del usuario final

> Foco: consistencia entre lo configurado en el panel de administración y lo que
> ve el usuario final (anónimo y autenticado estándar). Secciones cubiertas:
> Productos destacados, Productos (catálogo), Acerca de, Configuración del sitio
> (footer/banner) y Temas.

## Alcance

- **Se prueba:** coherencia admin ↔ público de las secciones de "Inicio"; diferencias
  visuales, de datos, de sincronización y de permisos (anónimo vs estándar). Además, el
  **módulo Productos (crear/editar)**: validaciones del modal, regla de estado/stock,
  coherencia entre secciones y reflejo en la tienda (ver TC-PROD-*).
- **No se prueba acá:** flujo de pago/checkout end to end (cubierto en
  `BACK/lia-store/qa/test-plan.md`, TC-100…TC-141b), despachos, render del
  carrusel por breakpoint.

## Pre-condiciones

- Frontend `http://localhost:5173`, backend `http://localhost:3000/api`, Supabase
  `nakhbsncabvwyrezhfsf` activos.
- Usuarios de prueba:
  - **Admin:** `brian-ayala.95@hotmail.com`
  - **Estándar:** `brian.ayala.pt@gmail.com`
- Datos al momento de la prueba: 3 productos `featured=true` y `status=active`
  (`zapatos` id 14, `sandalias` id 13, `Campera` id 11), todos con stock > 0.
- Para simular "visitante nuevo": borrar `localStorage` clave `lia.seasonTheme.v2`.

---

## Casos

```
ID: TC-INI-01
Caso: Productos destacados — admin vs home público
Tipo: failure (consistencia de datos)
Pre-condición: 3 productos marcados destacados en el panel ("3 en home").
Pasos:
  1. Admin → Inicio: contar destacados y leer el badge.
  2. Abrir / (home) como anónimo: contar tarjetas de "Productos Destacados".
Esperado: el home muestra los mismos 3 productos que el panel.
Resultado: ok (post-fix). Antes: FAIL — el panel mostraba 3 ("3 en home") y el
           home sólo 2 (faltaba `sandalias`).
```

```
ID: TC-INI-02
Caso: Producto destacado/activo con stock a nivel producto aparece en catálogo
Tipo: failure (consistencia de datos)
Pre-condición: `sandalias` (id 13) Activo, stock 56, variante de talle SIN
               `stockByOption` (stock controlado a nivel producto).
Pasos:
  1. /products como anónimo → buscar "sandalias".
  2. Abrir /product/13.
Esperado: aparece en el catálogo y en el detalle muestra "56 disponibles".
Resultado: ok (post-fix). Antes: FAIL — invisible en home y catálogo; el stock
           derivado de variantes daba 0 y el filtro `stock>0` lo ocultaba.
```

```
ID: TC-INI-03
Caso: Comprabilidad del producto con stock a nivel producto (no romper checkout)
Tipo: edge
Pre-condición: TC-INI-02.
Pasos:
  1. /product/13 → seleccionar color (Beige) y talle (38).
  2. "Agregar al carrito".
Esperado: se agrega al carrito; el límite de cantidad es el stock del producto (56).
Resultado: ok (post-fix). Verificado: ítem "sandalias · Beige · Talle 38" en carrito.
```

```
ID: TC-INI-04
Caso: Tema global del admin aplicado a visitante nuevo
Tipo: failure (sincronización)
Pre-condición: panel Temas con "Invierno" publicado como Global
               (`site_content.season_theme = winter`). Sin `localStorage`.
Pasos:
  1. Borrar `lia.seasonTheme.v2`.
  2. Recargar /.
Esperado: `document.documentElement.dataset.season === "winter"`.
Resultado: ok (post-fix). Antes: FAIL — siempre quedaba "default"; el provider no
           leía el tema remoto.
```

```
ID: TC-INI-05
Caso: La preferencia manual del usuario tiene prioridad sobre el tema global
Tipo: edge
Pre-condición: tema global = winter. Usuario con elección propia.
Pasos:
  1. Setear `lia.seasonTheme.v2` con `{season:'summer', mode:'manual'}`.
  2. Recargar /.
Esperado: `dataset.season === "summer"` (el global NO pisa la elección del usuario).
Resultado: ok (post-fix).
```

```
ID: TC-INI-06
Caso: Anónimo vs usuario estándar — misma experiencia
Tipo: security (permisos)
Pre-condición: ninguna.
Pasos:
  1. Home como anónimo: registrar destacados y tema.
  2. Login estándar (`brian.ayala.pt@gmail.com`): repetir.
Esperado: destacados y tema idénticos; sin contenido extra ni faltante por rol.
Resultado: ok.
```

```
ID: TC-INI-07
Caso: Acerca de — admin vs público
Tipo: happy
Pre-condición: contenido cargado en el editor "Acerca de".
Pasos:
  1. Admin → Acerca de: leer título hero, descripción, misión, visión.
  2. /about: comparar hero, descripción y modal "Conócenos más".
Esperado: hero/descripción coinciden; misión y visión coinciden dentro del modal.
Resultado: ok. Observación: `values` está vacío en la base y el modal no lista
           valores (consistente). Datos de prueba a limpiar (alt "donde esta").
```

```
ID: TC-INI-08
Caso: Configuración del sitio (footer) — admin vs público
Tipo: happy
Pasos:
  1. Admin → Config. del sitio: marca, WhatsApp, copyright, redes.
  2. Footer público: comparar.
Esperado: los valores coinciden.
Resultado: ok en render. Observación: TikTok/Facebook apuntan a una URL de Waze
           (dato cargado mal). Post-fix el editor valida que sean http(s); el dato
           existente debe corregirse manualmente desde el panel.
```

```
ID: TC-INI-09
Caso: Banner de la tienda — admin vs público
Tipo: happy
Pre-condición: banner con texto y "visible = true".
Pasos:
  1. Admin → Config. del sitio → Banner.
  2. Home/About público: ver la barra superior.
Esperado: el texto del banner se muestra arriba en el sitio público.
Resultado: ok. Observación de contenido: el texto dice "OTOÑO" mientras el tema
           global es "Invierno" — incoherencia de contenido a cargo del admin.
```

```
ID: TC-INI-10
Caso: Acerca de — sin imagen no rompe el render
Tipo: edge / a11y
Pasos:
  1. Abrir /about y revisar la consola.
Esperado: sin warning de `src=""`; la imagen se renderiza sólo cuando hay URL.
Resultado: ok (post-fix).
```

---

## Casos — Módulo Productos (Admin: crear / editar)

> Probado con Playwright el 2026-06-15. Modal `ProductModal` + tabla `ProductTable`
> + reflejo en `/products` y `/product/:id`. Backend `productController`.

```
ID: TC-PROD-01
Caso: Crear — nombre requerido (validación inline)
Tipo: edge
Pasos:
  1. Nuevo Producto → dejar nombre vacío → Guardar.
Esperado: error inline "El nombre es requerido" bajo el campo; no guarda; queda en
          "Datos Básicos".
Resultado: ok.
```

```
ID: TC-PROD-02
Caso: Crear — precio requerido (validación inline)
Tipo: edge
Pasos:
  1. Nuevo Producto → nombre cargado, precio vacío → Guardar.
Esperado: error inline "El precio es requerido y debe ser mayor a 0"; no guarda.
Resultado: ok (post-fix). Antes: sólo fallaba con 400 genérico del backend al guardar.
```

```
ID: TC-PROD-03
Caso: Crear/editar — producto "Activo" sin stock se bloquea con popup (cliente)
Tipo: failure (regla de negocio)
Pasos:
  1. Nuevo Producto → nombre + precio, stock 0, estado Activo → Guardar.
Esperado: popup "No se puede activar sin stock" (botón "Entendido"); no guarda.
          Con estado "Inactivo" sí guarda (stock 0 permitido).
Resultado: ok (post-fix). Antes: guardaba Activo con stock 0 sin aviso y el catálogo
           lo ocultaba (estado engañoso).
```

```
ID: TC-PROD-04
Caso: Backend — crear/activar sin stock rechazado (defensa server-side)
Tipo: security (no confiar en el cliente)
Pre-condición: token admin válido.
Pasos:
  1. POST /api/products {status:"active", stock:0}.
  2. POST /api/products {status:"inactive", stock:0}.
  3. PUT /api/products/:id {status:"active"} sobre un producto con stock 0.
  4. PUT /api/products/:id {status:"active", stock:5}.
Esperado: 1→400, 2→201, 3→400, 4→200.
Resultado: ok (post-fix). Antes: el backend guardaba el `status` tal cual (sin validar).
```

```
ID: TC-PROD-05
Caso: Crear — campo Stock editable sin variantes de talle
Tipo: edge
Pasos:
  1. Nuevo Producto sin variante "Talle" → ver el campo Stock.
Esperado: input "Stock disponible" editable (no tarjeta derivada).
Resultado: ok (post-fix). Antes: al crear sólo había tarjeta derivada (no se podía
           cargar stock manual; nacía en 0).
```

```
ID: TC-PROD-06
Caso: Crear completo — todas las secciones persisten y se reflejan en el detalle
Tipo: happy
Pasos:
  1. Crear con variante Talle (S:3, M:4), descuento 20%, envío gratis, descripción,
     características, especificación (Material: 100% Cuero), FAQ, garantía, devolución.
  2. Abrir /product/:id.
Esperado: stock 7 (suma de talles), $200→$160 (20% OFF), envío gratis, talles S/M,
          y las pestañas Descripción / Especificaciones / Preguntas frecuentes con
          su contenido.
Resultado: ok.
```

```
ID: TC-PROD-07
Caso: Stock derivado de talles — tabla admin = modal = público
Tipo: failure (consistencia de datos)
Pre-condición: "zapatos" con talles que suman 15 (columna `stock` quedó en 10).
Pasos:
  1. Tabla admin → leer Stock de "zapatos".
  2. Editar → ver "Stock total".
  3. /product/:id → ver "disponibles".
Esperado: los tres muestran 15.
Resultado: ok (post-fix). Antes: tabla admin 10, modal y público 15.
```

```
ID: TC-PROD-08
Caso: Promociones — vista previa del modal = vista del cliente
Tipo: failure (consistencia de datos)
Pasos:
  1. Editar/crear con precio 10 y descuento 3 → pestaña Promociones.
  2. Comparar con la tarjeta pública del producto.
Esperado: ambos muestran "$10,00 → $9,70 (3% OFF)".
Resultado: ok (post-fix). Usa `getProductPricing` (misma función que la tienda).
           Antes: el modal mostraba el `original_price` viejo de la base ("$8")
           que el público ignoraba.
```

```
ID: TC-PROD-09
Caso: Reflejo en la tienda con y sin login; stock 0 oculta el producto
Tipo: security (permisos) / failure
Pasos:
  1. Producto Activo con stock 0 → buscar en /products (logueado y anónimo).
  2. Subir stock > 0 → repetir.
Esperado: con stock 0 NO aparece (catálogo filtra stock > 0); con stock > 0 aparece.
          La visibilidad es idéntica logueado y anónimo (query pública de Supabase).
Resultado: ok.
```

```
ID: TC-PROD-10
Caso: Dato de promo corregido — "sandalias"
Tipo: failure (dato en producción)
Pre-condición: "sandalias" (id 13) tenía `original_price=78000`, `discount=100`, `price=1`.
Pasos:
  1. Corregir en la base: `original_price = NULL`, `discount = 10`.
  2. /products → tarjeta de "sandalias".
Esperado: "$1,00 → $0,90 (10% OFF)" (antes: "$78.000,00 → $1,00", 100% OFF).
Resultado: ok (post-fix de datos).
```

```
ID: TC-PROD-11
Caso: Mensaje humano al expirar la sesión
Tipo: a11y / UX
Pasos:
  1. Con la sesión vencida/limpia, intentar guardar un producto.
Esperado: el modal muestra "Tu sesión expiró. Volvé a iniciar sesión para continuar."
          (no el técnico "Token no disponible").
Resultado: ok (post-fix). Verificado por código (mismo flujo que antes mostraba el
           mensaje viejo); `getAuthToken` lanza el texto nuevo y `extractErrorMessage`
           lo propaga al banner.
```

```
ID: TC-PROD-12
Caso: Borrar un producto no borra la imagen Cloudinary que comparte con otro
Tipo: failure (pérdida de datos)
Pre-condición: dos productos con el mismo `public_id` (imagen reutilizada).
Pasos:
  1. Crear un producto con la misma imagen que "zapatos" (mismo `public_id`).
  2. Borrarlo (DELETE /api/products/:id).
  3. Pedir la URL de la imagen en Cloudinary; revisar que "zapatos" siga intacto.
Esperado: el producto se elimina (200), la imagen sigue **viva** (HTTP 200) y "zapatos"
          conserva su imagen.
Resultado: ok (post-fix). Antes: el backend borraba el asset por `public_id` y rompía
           la imagen del otro producto.
```

```
ID: TC-PROD-13
Caso: Responsive del módulo Productos (320 / 768 / 1440)
Tipo: a11y / responsive
Pasos:
  1. /products, /product/:id, /admin/products y el modal de producto en 320, 768 y 1440.
  2. Medir overflow horizontal (`scrollWidth > clientWidth`) y revisar capturas.
Esperado: sin scroll horizontal; catálogo en grilla 2-col (320) → más columnas en
          desktop; tabla admin = cards en 320 y tabla en ≥desktop; modal con tabs en
          wrap (320) → sidebar (≥768); botones del footer completos.
Resultado: ok (post-fix del footer). Sin overflow en ningún breakpoint. Modal: 6 tabs
           completos en 320; "Guardar producto" se recortaba a ≤360 → arreglado
           (footer apilado). Hallazgos abiertos en el detalle público:
           WhatsApp flotante tapa "Agregar al carrito" y "Calcular" (envío) se corta
           a 320 (ver PROD-BUG-11/12).
```

```
ID: TC-PROD-14
Caso: Guardar producto "Activo" sin stock pide confirmación en vez de bloquear
Tipo: happy / regression
Pre-condición: sesión admin, `/admin/products`.
Pasos:
  1. Crear (o editar) un producto, poner Estado = "Activo" y Stock = 0 (sin variantes).
  2. "Guardar producto".
  3. En el modal "Producto sin stock", click "Mostrar igualmente".
Esperado: se abre el modal de confirmación (no el bloqueo antiguo); tras confirmar,
          el producto se guarda como "Activo" con stock 0 y aparece en la tabla admin
          con badge Stock "0" (out) + Estado "Activo".
Resultado: no probado

ID: TC-PROD-15
Caso: Cancelar la confirmación de "sin stock" no guarda el producto
Tipo: edge
Pre-condición: igual a TC-PROD-14.
Pasos:
  1. Repetir pasos 1-2 de TC-PROD-14.
  2. En el modal, click "Cancelar" (o la X).
Esperado: el modal se cierra, el producto NO se guarda, el usuario sigue en el
          formulario con los datos intactos (puede corregir stock o pasar a Inactivo).
Resultado: no probado

ID: TC-PROD-16
Caso: Producto sin stock (activo) se muestra en la tienda marcado "Sin stock" y no se puede comprar
Tipo: happy / edge
Pre-condición: producto activo con stock 0 (creado en TC-PROD-14); variante equivalente
  con una talla en 0 y otra con stock.
Pasos:
  1. /products y / (home, si el producto está destacado): ubicar la card del producto.
  2. Abrir /product/:id directo.
  3. Para un producto con variantes: seleccionar la talla sin stock.
  4. Intentar "Comprar ahora" / "Agregar al carrito" con stock 0 (global o de la
     variante seleccionada).
Esperado: la card muestra insignia "Sin stock" (no la oculta el catálogo/home);
          el detalle no redirige a "Producto no disponible", muestra "Sin stock"
          bajo el título y en el selector de cantidad; la talla sin stock aparece
          tachada/deshabilitada; los botones de compra están deshabilitados y no
          se puede agregar al carrito en ningún caso de stock 0.
Resultado: no probado

ID: TC-PROD-17
Caso: Producto sin stock e Inactivo sigue oculto (no regresión)
Tipo: regression
Pasos:
  1. Editar el producto de TC-PROD-14: cambiar Estado a "Inactivo" (stock sigue 0).
  2. Guardar (no debe pedir confirmación: Inactivo no dispara la validación).
  3. Buscarlo en /products, /, y por URL directa /product/:id.
Esperado: se guarda sin confirmación; el producto no aparece en ningún listado
          público y /product/:id muestra "Producto no disponible".
Resultado: no probado
```

```
ID: TC-DESP-01
Caso: Estado de despacho en mobile usa el mismo desplegable que desktop
Tipo: failure (paridad desktop ↔ mobile)
Pre-condición: al menos un pedido pagado.
Pasos:
  1. /admin/dispatches en mobile (≤640px) → tarjeta de un pedido.
  2. Abrir el control "Estado despacho".
Esperado: es un <select> con todas las opciones (Pendiente, En preparación,
          Despachado/Listo para retiro, Entregado), igual que la tabla desktop;
          ya no aparece el botón "Avanzar".
Resultado: verificado estático (tsc + eslint en verde; reusa el mismo <select>,
           `getDispatchStatusFieldSx` y MenuItems de la tabla desktop, que ya
           funcionan). El AFTER en vivo no se pudo capturar por inestabilidad del
           navegador MCP en la sesión (cierres + pérdida de sesión Supabase). El
           BEFORE (badge + "Avanzar", sin llegar a "Entregado") sí se verificó en vivo.
```

```
ID: TC-DATA-01
Caso: Nombres de producto con espacios sobrantes se muestran normalizados
Tipo: edge (saneo de datos)
Pre-condición: un producto en base con nombre con espacio al final/colapsable
               (ej. `"sandalias "`, `"Campera "`).
Pasos:
  1. /products y home como anónimo → ver la tarjeta del producto.
  2. /product/:id → ver el título.
  3. Buscador del navbar → tipear el nombre y ver el resultado.
  4. Admin → Productos → tabla y "Productos destacados".
Esperado: en todos lados el nombre se ve sin espacios sobrantes ni dobles espacios
          internos (cleanText: trim + colapso). Layout sin saltos por el espacio.
Resultado: verificado estático (tsc + eslint en verde). `cleanText` aplicado en
           `mapDbRowToProduct`, `searchProducts` y mappers admin.
```

```
ID: TC-DATA-02
Caso: Guardar un producto con nombre con espacios lo persiste limpio
Tipo: edge (saneo en escritura)
Pre-condición: admin logueado; modal de producto abierto.
Pasos:
  1. Editar/crear un producto y escribir el nombre con espacios al inicio/final
     (ej. `"  Remera  oversize "`).
  2. Guardar.
  3. Releer el producto (recargar la tabla / abrir el detalle público).
Esperado: el nombre persistido y mostrado es `"Remera oversize"` (trim + colapso).
          No se vuelve a generar el dato sucio.
Resultado: verificado estático. `buildProductBody` recorta el nombre antes de enviar.
```

```
ID: TC-DATA-04
Caso: Categorías con espacios sobrantes siguen matcheando el filtro de catálogo
Tipo: failure (consistencia de datos / no-regresión del filtro)
Pre-condición: una categoría del árbol y/o `productos.category` con espacio
               sobrante (ej. nodo `"Campera "` y/o producto con `category="Campera "`).
Pasos:
  1. /products?category=Campera (link del navbar) como anónimo.
  2. Navbar → entrar a la categoría desde el menú.
  3. URL manual con espacio: /products?category=Campera%20 .
  4. Admin → Productos → filtrar por esa categoría en el dropdown.
Esperado: en los 4 casos el producto aparece bajo su categoría (el match compara
          texto-limpio ↔ texto-limpio); ningún producto se "pierde" por el espacio.
Resultado: verificado estático (tsc + eslint en verde). `cleanText` en ambos lados:
           `fetchCategoriesTree`, `fetchCategories`, mappers de producto y `filterBy`.
```

```
ID: TC-DATA-05
Caso: Categorías se muestran y guardan con la primera letra en mayúscula
Tipo: edge (presentación / saneo en escritura)
Pre-condición: una categoría en base en minúscula (ej. `"campera"`).
Pasos:
  1. Home/navbar y /products como anónimo → ver el nombre de la categoría.
  2. Admin → Productos → dropdown de categorías y tabla.
  3. Admin → modal de producto → crear una categoría nueva tipeando en minúscula
     (ej. `"  remeras "`) y guardar.
  4. Asignar esa categoría a un producto y guardar; reabrir el producto.
Esperado: en todos lados la categoría se ve capitalizada (`"Campera"`, `"Remeras"`);
          la categoría creada se persiste como `"Remeras"` (trim + mayúscula inicial);
          el producto sigue apareciendo bajo su categoría (match intacto).
Resultado: verificado estático (tsc + eslint en verde). `normalizeCategory` en lectura
           y escritura; el match del filtro compara en minúsculas (capitalización neutra).
```

```
ID: TC-DATA-03
Caso: Carrito caduca tras 30 días de inactividad (TTL deslizante)
Tipo: failure (persistencia)
Pre-condición: carrito con al menos 1 ítem.
Pasos:
  1. Agregar un ítem → confirmar que `localStorage["damiana-bella-cart"]` tiene `savedAt`.
  2. Simular abandono: setear `savedAt` a hace > 30 días y recargar.
  3. Caso de control: setear `savedAt` a hace < 30 días y recargar.
Esperado: (2) el carrito se descarta al rehidratar y la clave se borra de localStorage;
          (3) el carrito se mantiene. Cualquier cambio en el carrito restampa `savedAt`
          (expiración deslizante, no fija desde la creación).
Resultado: verificado estático (tsc + eslint en verde). `expiringStorage` envuelve
           localStorage con el TTL; JSON corrupto se trata como ausente.
```

---

## Casos — Opciones configurables de la card de producto (2026-09-18)

> Feature: `admin/components/ProductCardOptionsManager` (tabla `product_card_options`,
> RLS admin-only) + sección `product-card__badges` en `ProductCard`. Reemplaza los
> círculos de color en las cards de listado (el detalle de producto no se tocó).
> **Nota:** implementado y verificado con `tsc -b` + `eslint` (sin errores). No se
> pudo correr en navegador vía Playwright en esta sesión (instancia ya en uso) —
> casos marcados "no probado" quedan pendientes de una pasada E2E real antes de
> dar la feature por cerrada.

```
ID: TC-CARDOPT-01
Caso: Las cards de listado ya no muestran los círculos de color
Tipo: happy
Pasos:
  1. Ir a /products (o Home) con un producto que tenga variante "Color".
Esperado: la card no muestra círculos de color; el detalle del producto
          (/product/:id) sigue mostrándolos igual que antes.
Resultado: no probado (verificado por lectura de código: `product-card__colors`
           eliminado de ProductCard.tsx, ProductDetail.tsx sin cambios).
```

```
ID: TC-CARDOPT-02
Caso: Admin — crear una opción de card
Tipo: happy
Pre-condición: sesión admin.
Pasos:
  1. Admin → Productos → "Opciones de la card de producto".
  2. Escribir texto (ej. "Envío gratis"), elegir ícono, Añadir opción.
Esperado: la opción aparece en la lista, activa por defecto; persiste tras recargar.
Resultado: no probado.
```

```
ID: TC-CARDOPT-03
Caso: Admin — editar una opción existente
Tipo: happy
Pasos:
  1. Click en lápiz (editar) sobre una opción → cambiar texto e ícono → Guardar (check).
Esperado: se actualiza en la lista y en las cards públicas tras refrescar.
Resultado: no probado.
```

```
ID: TC-CARDOPT-04
Caso: Admin — activar/desactivar una opción
Tipo: happy
Pasos:
  1. Click en el toggle "Activa"/"Inactiva" de una opción.
Esperado: cambia de estado con optimistic update; si falla el guardado en Supabase,
          vuelve al estado anterior y muestra error. Las opciones inactivas no
          aparecen en las cards públicas.
Resultado: no probado.
```

```
ID: TC-CARDOPT-05
Caso: Admin — eliminar una opción
Tipo: happy
Pasos:
  1. Click en tacho de basura sobre una opción.
Esperado: desaparece de la lista y de las cards públicas; si falla el delete,
          se restaura la lista anterior y muestra error.
Resultado: no probado.
```

```
ID: TC-CARDOPT-06
Caso: Admin — reordenar opciones (drag & drop)
Tipo: happy
Pasos:
  1. Arrastrar una opción a otra posición de la lista.
Esperado: el nuevo orden persiste tras recargar y se refleja en el orden de los
          badges dentro de cada card pública.
Resultado: no probado.
```

```
ID: TC-CARDOPT-07
Caso: Card sin opciones configuradas/activas no deja espacio vacío
Tipo: edge
Pre-condición: ninguna opción activa (todas eliminadas o desactivadas).
Pasos:
  1. Ver el listado de productos.
Esperado: la card no reserva espacio para la sección de badges (el bloque
          `<ul>` no se renderiza cuando `cardOptions.length === 0`).
Resultado: no probado (verificado por lectura de código: render condicional).
```

```
ID: TC-CARDOPT-08
Caso: Card con varias opciones y texto largo no rompe el diseño
Tipo: edge
Pasos:
  1. Crear 5+ opciones activas, alguna con texto cercano al máximo (40 caracteres).
  2. Ver la card en mobile (375px) y desktop.
Esperado: los badges wrappean a la línea siguiente sin desbordar la card; el texto
          largo se corta con ellipsis (`text-overflow: ellipsis`) y el título
          completo aparece en el `title` del badge al hacer hover.
Resultado: no probado.
```

```
ID: TC-CARDOPT-09
Caso: Usuario común (no admin) no puede escribir en product_card_options
Tipo: security
Pre-condición: sesión de usuario autenticado sin rol admin.
Pasos:
  1. Intentar INSERT/UPDATE/DELETE directo contra `product_card_options` con la
     sesión de un usuario no-admin (ej. desde la consola, usando el cliente
     Supabase ya autenticado).
Esperado: rechazado por RLS (`product_card_options_insert_admin` /
          `_update_admin` / `_delete_admin` exigen `is_admin()`); el SELECT sí
          funciona (lectura pública).
Resultado: no probado — requiere aplicar el script SQL
           `db/migrations/2026-09-18_add_product_card_options.sql` en Supabase
           antes de poder verificarlo.
```

```
ID: TC-CARDOPT-10
Caso: Usuario anónimo puede leer las opciones activas (para que el listado público funcione)
Tipo: happy
Pasos:
  1. Sin sesión, cargar /products.
Esperado: `fetchProductCardOptions()` responde con las opciones activas (política
          `product_card_options_select_public`, rol `anon`).
Resultado: no probado (mismo bloqueo que TC-CARDOPT-09: falta aplicar el script SQL).
```

## Casos — Mobile 375px

> Probado con Playwright en viewport 375×812 el 2026-06-19.

```
ID: TC-MOB-01
Caso: Home en 375px — layout y navegación
Tipo: happy / responsive
Pasos:
  1. Viewport 375×812 → navegar a /.
  2. Verificar navbar, carrusel, grid de productos, footer.
Esperado: navbar compacto (logo + search + cart); carrusel full-width; grid 2 columnas; footer apilado.
Resultado: OK (2026-06-19, Playwright 375×812)

ID: TC-MOB-02
Caso: Catálogo en 375px — grid y badges
Tipo: happy / responsive
Pasos:
  1. Viewport 375×812 → /products.
  2. Verificar grid, badges de descuento, precios tachados, botones.
Esperado: grid 2 columnas; badges "X% OFF" visibles; precio original tachado; "Leer más" accesible.
Resultado: OK (2026-06-19)

ID: TC-MOB-03
Caso: Detalle de producto en 375px — variantes y validación inline
Tipo: happy + edge / responsive
Pasos:
  1. Viewport 375×812 → /product/14.
  2. Click "Agregar al carrito" sin seleccionar color.
  3. Seleccionar Talle 37 + Color Rojo → "Agregar al carrito".
Esperado: (2) error inline "Por favor seleccioná: color" con borde rojo;
          (3) ítem agregado, badge "1" en carrito.
Resultado: OK (2026-06-19).
Hallazgo abierto HALL-006: texto del botón "Agregar al carrito" se trunca como
"Agregar al ca..." en la sticky bar inferior — dos botones no caben en 375px.
Fix sugerido: apilar botones en columna a ≤400px.

ID: TC-MOB-04
Caso: Carrito drawer en 375px
Tipo: happy / responsive
Pasos:
  1. Viewport 375×812 → abrir carrito (ícono navbar).
Esperado: drawer full-width; imagen + variante "Talle · Color"; total;
          botones "Vaciar carrito" e "Ir a pagar" full-width.
Resultado: OK (2026-06-19)

ID: TC-MOB-05
Caso: Checkout en 375px
Tipo: happy / responsive
Pasos:
  1. Viewport 375×812 → /checkout con ítem en carrito.
  2. Verificar resumen, datos pre-rellenados, envío, métodos de pago, total, CTA.
Esperado: resumen apilado; datos pre-rellenados (sesión activa); opciones de envío/pago
          legibles; "Continuar al pago" full-width.
Resultado: OK (2026-06-19)

ID: TC-MOB-06
Caso: Admin Ventas en 375px
Tipo: happy / responsive
Pasos:
  1. Viewport 375×812 → /admin/sales.
Esperado: tabla adaptada a cards; stats visibles; filtros como selects funcionales.
Resultado: OK (2026-06-19)

ID: TC-MOB-07
Caso: Admin Despachos en 375px
Tipo: happy / responsive
Pasos:
  1. Viewport 375×812 → /admin/dispatches.
Esperado: cards con imagen, estado, select de despacho accesible; sin overflow horizontal.
Resultado: OK (2026-06-19)

ID: TC-MOB-08
Caso: Admin Productos en 375px — tabla como cards + sidebar hamburger
Tipo: happy / responsive
Pasos:
  1. Viewport 375×812 → /admin/products.
  2. Click ícono hamburger (top-left).
Esperado: tabla como cards con labels PRECIO/STOCK/ESTADO; sidebar se despliega como
          overlay con todos los ítems del menú.
Resultado: OK (2026-06-19)
```

## Casos — Compra restringida (admin)

```
ID: TC-RESTRICT-01
Caso: Admin marca a un usuario como "comprador habilitado" (con popup de confirmación)
Tipo: happy
Pasos:
  1. /admin/users → click en el ícono de candado abierto (Unlock) de un usuario.
  2. Confirmar en el popup ("¿Estás seguro de marcar...?").
Esperado: popup se cierra, aparece el banner amarillo "Modo de compra restringida
  activo...", modal de feedback de éxito, y el ícono del usuario pasa a candado
  cerrado (Lock).
Resultado: no probado

ID: TC-RESTRICT-02
Caso: Cancelar el popup no aplica el cambio
Tipo: edge
Pasos:
  1. /admin/users → click en el toggle de compra de un usuario.
  2. Click "Cancelar" en el popup.
Esperado: no se llama a la API, el usuario queda sin cambios.
Resultado: no probado

ID: TC-RESTRICT-03
Caso: Usuario NO habilitado intenta comprar con el modo restringido activo
Tipo: failure
Pre-condición: al menos un usuario distinto marcado (TC-RESTRICT-01 aplicado)
Pasos:
  1. Loguearse con un usuario sin marcar → agregar producto al carrito → /checkout.
  2. Completar el formulario y elegir transferencia → "Continuar".
  3. Repetir con Mercado Pago → "Continuar al pago".
Esperado: en ambos casos aparece el mensaje "Por el momento no es posible comprar.
  Sitio en mantenimiento, gracias por tu paciencia." (área de error del checkout,
  sin redirección ni orden creada).
Resultado: no probado

ID: TC-RESTRICT-04
Caso: Admin desmarca al último usuario → banner desaparece y compra vuelve a andar
Tipo: happy / regression
Pre-condición: un solo usuario marcado
Pasos:
  1. /admin/users → click en el toggle del usuario marcado → confirmar.
Esperado: banner de "modo restringido" desaparece; un usuario cualquiera puede
  completar TC-100/TC-109 (checkout MP/transferencia) sin bloqueo.
Resultado: no probado
```

---

## Casos — Rotación de imágenes en la card de producto (2026-09-18)

> Feature: `users/components/ProductCard/ProductCard.tsx` + `ProductCard.css`.
> La card usa únicamente las dos primeras imágenes de `product.images` (orden
> configurado desde Admin → Productos), la 1ra como imagen inicial y la 2da
> como imagen de interacción (hover en desktop; en mobile el propio `:hover`
> de CSS se dispara con el primer tap, sin JS de touch adicional). De la 3ra
> imagen en adelante no participan.
> **Nota:** verificado con `tsc -b` (sin errores) y por lectura de código
> (`productService.ts` confirma que `images[0]` es siempre igual a
> `product.image` y que el array respeta el orden guardado por Admin). No se
> pudo correr en navegador vía Playwright en esta sesión (instancia ya en
> uso por otro proceso) — casos marcados "no probado" quedan pendientes de
> una pasada E2E real antes de dar la feature por cerrada.

```
ID: TC-IMGROT-01
Caso: Producto con 2+ imágenes — hover en desktop muestra la 2da imagen
Tipo: happy
Pre-condición: producto con `images` = [A, B, C] configurado en ese orden desde Admin.
Pasos:
  1. Ir a /products (o Home), ubicar la card del producto.
  2. Pasar el mouse sobre la card (sin salir).
  3. Sacar el mouse de la card.
Esperado: al entrar el hover hace crossfade de A → B (imagen `images[1]`);
          al salir vuelve a A. La imagen C nunca se muestra en la card.
Resultado: no probado (verificado por lectura de código y `tsc -b`).
```

```
ID: TC-IMGROT-02
Caso: Producto con una sola imagen — no hay rotación
Tipo: edge
Pre-condición: producto con `images` = [A] (o sin array `images`, solo `image`).
Pasos:
  1. Ubicar la card en el listado.
  2. Hacer hover.
Esperado: se muestra siempre A; no se renderiza una segunda imagen ni hay
          crossfade (sin parpadeo ni "flash" de imagen vacía).
Resultado: no probado (verificado por lectura de código: `secondaryImage`
           queda `null` y el segundo `<img>` no se renderiza).
```

```
ID: TC-IMGROT-03
Caso: Orden de imágenes respeta lo configurado en Admin tras guardar y recargar
Tipo: happy
Pre-condición: sesión admin.
Pasos:
  1. Admin → Productos → editar un producto → reordenar imágenes (mover una
     imagen distinta a la posición 1 y otra a la posición 2) → Guardar.
  2. Recargar la página del listado público (F5) sin cache de SPA.
  3. Hacer hover sobre la card del producto editado.
Esperado: la imagen inicial de la card es la que quedó en la posición 1;
          el hover muestra la que quedó en la posición 2, coincidiendo con
          el orden guardado en Admin.
Resultado: no probado.
```

```
ID: TC-IMGROT-04
Caso: Mobile — tap en la card muestra la 2da imagen
Tipo: happy
Pasos:
  1. Viewport mobile (375px) o dispositivo táctil real.
  2. Tocar la card de un producto con 2+ imágenes (sin soltar/navegar).
Esperado: el tap dispara el mismo estado `:hover` que en desktop y hace
          crossfade a la 2da imagen; al tocar fuera de la card vuelve a la
          imagen principal.
Resultado: no probado en dispositivo real. La implementación depende del
           comportamiento estándar de `:hover` por tap en navegadores
           móviles WebKit/Blink (no hay JS de touch propio) — a confirmar
           en un dispositivo táctil real antes de cerrar la feature.
```

---

## Casos — Dropdown de categoría y tabla de productos en desktop (2026-09-18)

> Fix: `admin/components/ProductModal/ProductModal.tsx`+`.css` (panel de
> categoría montado en portal, `position: fixed`), `admin/components/
> ProductTable/ProductTable.tsx`+`.css` (wrapper `.admin-table-scroll`) y
> `admin/styles/adminShared.css` (`.toolbar-filters` deja de forzar
> `nowrap` desde 640px). Verificado en vivo con Playwright contra
> `localhost:5180` (front) + `localhost:3000` (back), login admin real.

```
ID: TC-CATDROP-01
Caso: Dropdown de categoría abierto cerca del borde inferior del modal — no se recorta
Tipo: happy
Pre-condición: modal "Nuevo Producto" abierto, viewport 1366x800.
Pasos:
  1. Click en el select de Categoría.
  2. Click en "ver más" de una categoría con hijos (ej: Calzado), luego de otra
     (ej: Indumentaria) para alargar la lista.
Esperado: el panel se posiciona debajo del trigger, nunca queda cortado por el
          borde del modal; si el contenido supera el espacio disponible en el
          viewport, el panel muestra su propio scroll interno (no el del modal).
Resultado: OK — verificado (scrollHeight 694px / clientHeight 562px con
           scroll interno funcional, último ítem "Sacos" visible al scrollear).
```

```
ID: TC-CATDROP-02
Caso: Dropdown de categoría en mobile (375px) dentro del modal fullscreen
Tipo: edge
Pasos:
  1. Viewport 375x700, abrir "Nuevo Producto", abrir el select de Categoría.
  2. Expandir "ver más" para alargar el listado.
Esperado: mismo comportamiento que en desktop — el panel se ancla al trigger,
          no se recorta contra el borde del modal fullscreen.
Resultado: OK — verificado.
```

```
ID: TC-CATDROP-03
Caso: Cerrar el dropdown clickeando afuera (backdrop)
Tipo: happy
Pasos:
  1. Abrir el dropdown de categoría.
  2. Click fuera del panel (sobre el fondo oscurecido del modal).
Esperado: el dropdown se cierra sin seleccionar ninguna categoría.
Resultado: OK — el backdrop del portal recibe el click (z-index 2100, por
           encima del Dialog de MUI en 2000) y cierra el panel.
```

```
ID: TC-TABLE-01
Caso: Filtros de Productos (categoría/estado/stock) no se cortan en desktop
Tipo: happy
Pre-condición: viewport 1366x800, sidebar admin visible.
Pasos:
  1. Ir a Admin → Productos.
  2. Observar la fila de filtros debajo de "Buscar por nombre...".
Esperado: los 3 selects ("Todas las categorías", "Todos los estados", "Todo el
          stock") se ven completos; si no entran en una fila, bajan de línea
          en vez de cortarse contra el borde del contenedor.
Resultado: OK — antes del fix el tercer select ("Todo el stock") quedaba
           cortado a la mitad; ahora se ve completo.
```

```
ID: TC-TABLE-02
Caso: Tabla de productos con scroll horizontal si el contenedor es angosto
Tipo: edge
Pasos:
  1. Viewport de laptop angosta (ej: 1024px) con sidebar admin ocupando espacio.
  2. Observar la tabla de productos (7 columnas).
Esperado: si las columnas no entran, el wrapper `.admin-table-scroll` scrollea
          horizontalmente en vez de desbordar el layout de la página.
Resultado: OK (verificado por CSS: min-width 720px en `.admin-table` +
           overflow-x auto en el wrapper; no se pudo forzar overflow real con
           los 2 productos de prueba disponibles en esta sesión, pendiente
           confirmar con un catálogo más largo).
```

---

## Matriz de cobertura

> Casos `INI-*` usan numeración corta (01–10); casos del módulo Productos usan el
> prefijo `P` (P01 = TC-PROD-01).

| Sección \ Tipo          | happy | edge        | failure        | security | a11y |
|-------------------------|:-----:|:-----------:|:--------------:|:--------:|:----:|
| Productos destacados    | 01    | 03          | 01,02          |          |      |
| Catálogo de productos   |       | 03          | 02             |          |      |
| Acerca de               | 07    |             |                |          | 10   |
| Config. sitio (footer)  | 08,09 |             |                |          |      |
| Temas                   |       | 05          | 04             | 06       |      |
| Productos: validaciones |       | P01,P02,P05 | P03            | P04      | P11  |
| Productos: coherencia   | P06   |             | P07,P08,P09,P10,P12 |     |      |
| Saneo de datos / carrito |      | DATA-01,DATA-02,DATA-05 | DATA-03,DATA-04 |  |      |
| Mobile 375px             | MOB-01,MOB-02,MOB-04,MOB-05,MOB-06,MOB-07,MOB-08 | MOB-03 | MOB-03 | | MOB-03 |
| Compra restringida (admin) | RESTRICT-01,RESTRICT-04 | RESTRICT-02 | RESTRICT-03 | RESTRICT-03 | |

## Cross-browser / device

| Combinación              | Estado     |
|--------------------------|------------|
| Chromium (Playwright)    | probado    |
| Safari iOS               | no probado |
| Android Chrome           | no probado |
| Responsive 320/768/1440  | probado (módulo Productos: catálogo, detalle, tabla admin y modal — ver TC-PROD-13) |
| Responsive 375px (Playwright) | probado (sesión 2026-06-19 — TC-MOB-01 a TC-MOB-08) |

## Hallazgos derivados (estado)

| ID      | Severidad | Estado            |
|---------|-----------|-------------------|
| BUG-001 | 🔴 Crítico | Arreglado         |
| BUG-002 | 🔴 Crítico | Arreglado         |
| BUG-003 | 🟡 Medio  | Arreglado (validación; dato existente a corregir a mano) |
| BUG-004 | 🟡 Medio  | Reportado (contenido del admin) |
| BUG-005 | 🟢 Bajo   | Arreglado         |
| BUG-006 | 🟢 Bajo   | Reportado (campo `altText` huérfano / dato de prueba) |
| BUG-007 | 🟢 Bajo   | Reportado (datos de prueba en producción) |

### Hallazgos del módulo Productos (sesión 2026-06-15)

> Numeración propia (`PROD-BUG-*`), independiente de la tabla de "Inicio" de arriba.

| ID          | Severidad | Estado | Caso |
|-------------|-----------|--------|------|
| PROD-BUG-01 | 🟠 Alto   | Arreglado (cliente + backend) — antes no había validación de "Activo sin stock" | TC-PROD-03/04 |
| PROD-BUG-02 | 🟠 Alto   | Arreglado — código muerto `autoInactive` del modal eliminado | — |
| PROD-BUG-03 | 🟡 Medio  | Arreglado — tabla admin usa stock derivado de variantes | TC-PROD-07 |
| PROD-BUG-04 | 🟡 Medio  | Arreglado — preview de Promociones usa `getProductPricing` | TC-PROD-08 |
| PROD-BUG-05 | 🟡 Medio  | Arreglado — datos de "sandalias" corregidos en base | TC-PROD-10 |
| PROD-BUG-06 | 🟡 Medio  | Arreglado — stock cargable al crear (input editable) | TC-PROD-05 |
| PROD-BUG-07 | 🟡 Medio  | Arreglado — validación inline de precio | TC-PROD-02 |
| PROD-BUG-08 | 🟢 Bajo   | Arreglado — mensaje humano al expirar sesión ("Tu sesión expiró...") | TC-PROD-11 |
| PROD-BUG-09 | 🟡 Medio  | Arreglado — no se borra la imagen Cloudinary si otro producto la comparte | TC-PROD-12 |
| PROD-BUG-10 | 🟢 Bajo   | Arreglado — footer del modal recortaba "Guardar producto" a ≤360px (apilado vertical) | TC-PROD-13 |
| PROD-BUG-11 | 🟡 Medio  | Reportado — botón flotante de WhatsApp tapa "Agregar al carrito" en el detalle a 320px | TC-PROD-13 |
| PROD-BUG-12 | 🟢 Bajo   | Reportado — botón "Calcular" (envío) se corta en el detalle a 320px | TC-PROD-13 |

### Hallazgos de sesiones E2E (2026-06-19)

| ID           | Severidad  | Estado | Descripción | Caso |
|--------------|------------|--------|-------------|------|
| BUG-001-RLS  | 🔴 Crítico | ✅ RESUELTO (2026-06-19) | RLS de Supabase bloqueaba INSERT en ventas para usuarios no-admin → fix: createOrder() ahora llama POST /api/orders/transfer en el backend | TC-169 (BACK) |
| BUG-002-DESP | 🟡 Medio   | ✅ RESUELTO (confirmado en código 2026-08-14, ver `docs/flows/DOCUMENTACION_FUNCIONAL_SISTEMA.md` §5.12 y §12) | ~~Falta opción "Despachado" en select de despacho para envíos a domicilio (solo "Listo para retiro")~~ `Dispatches.tsx` ya tiene los 5 estados (`pendiente`, `en_preparacion`, `despachado`, `listo_para_retiro`, `entregado`) con lógica condicional por `shipping_method`: pedidos con `shipping_method === 'local'` ofrecen "Listo para retiro", el resto ofrece "Despachado". No se identificó el commit puntual del fix; se reconfirmó contra el working tree actual, no contra una nueva pasada de Playwright. | TC-DESP-01 |
| HALL-006     | 🟡 Medio   | ABIERTO | Botón "Agregar al carrito" truncado ("Agregar al ca...") en sticky bar mobile 375px — dos botones no caben | TC-MOB-03 |
| HALL-003     | 🟡 Info    | Documentado | Sin guest checkout: todo flujo de compra requiere registro y email confirmado (no bloqueante, es decisión de diseño) | TC-168 (BACK) |
| HALL-004     | 🟢 Info    | Documentado | Webhook MP no funciona en dev local (localhost) — normal, el webhook necesita URL pública; en producción funciona | TC-100 (BACK) |
| HALL-005     | 🟢 Info    | Documentado | Admin logueado es redirigido a /admin al hacer login; navegar directo a /checkout tampoco funciona (AdminRedirect redirige al cargar) | HALL-008 (BACK) |

### Hallazgos de sesiones E2E (2026-07-01)

| ID           | Severidad  | Estado | Descripción | Caso |
|--------------|------------|--------|-------------|------|
| HALL-007     | 🟡 Medio   | ABIERTO | `/contact`: Cards "Redes Sociales" y "Correo Electrónico" no tienen CTAs funcionales — iconos TikTok/Facebook sin href, card Correo sin mailto | TC-174 (BACK) |
| HALL-008     | 🟡 Medio   | Documentado | `AdminRedirect` bloquea al admin del acceso a /checkout, /about, /contact via URL directa — impide QA de flujo compra con cuenta admin | TC-173/174 (BACK) |
