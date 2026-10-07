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
- El tema (color + tipografía) ya no tiene preferencia local por dispositivo:
  toda pestaña/equipo siempre refleja `site_content.season_theme` /
  `site_content.typography`. La única clave de `localStorage` relacionada que
  sigue existiendo es `lia.seasonTheme.customThemes.v1` (libreta de temas
  guardados del admin, no afecta a los visitantes).

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
  1. Borrar `lia.seasonTheme.v2` (clave legacy, si existiera).
  2. Recargar /.
Esperado: `document.documentElement.dataset.season === "winter"`.
Resultado: ok (post-fix). Antes: FAIL — siempre quedaba "default"; el provider no
           leía el tema remoto.
```

```
ID: TC-INI-05 — DEPRECATED
Caso: (antiguo) La preferencia manual del usuario tenía prioridad sobre el tema global
Motivo de baja: esa preferencia local por dispositivo (`localStorage`) era la
                causa raíz del bug reportado — un dispositivo que alguna vez
                fijaba una elección quedaba bloqueado para siempre a una copia
                vieja, sin ningún control equivalente del lado del visitante
                que la hiciera necesaria. Se eliminó: el tema es 100% global,
                lo define sólo el admin. Reemplazado por TC-INI-05b.
```

```
ID: TC-INI-05b
Caso: Cambiar el tema/tipografía desde Admin se refleja en TODOS los
      dispositivos, incluso los que ya interactuaron antes con el panel
Tipo: failure (regresión del bug reportado — multi-dispositivo)
Pre-condición: dos navegadores/equipos distintos (A y B). En B, ingresar
               previamente al panel Temas y aplicar cualquier tema (para
               dejarlo en el estado "ya interactuó" que antes rompía la sync).
Pasos:
  1. Desde A (Admin → Temas): elegir "Verano", ajustar tipografía a "Inter" y
     tocar "Guardar para todos".
  2. En B, sin borrar `localStorage`, sólo recargar la pestaña pública (no el
     panel admin).
  3. Repetir el paso 2 en una ventana de incógnito de B.
Esperado: A, B (recargado) e incógnito de B muestran el mismo
          `dataset.season === "summer"` y la misma tipografía. B no debe
          quedar en un tema viejo por haber usado el panel antes.
Resultado: ok (post-fix). Antes: FAIL en B (no incógnito) — quedaba con el
           tema/tipografía previos, y "borrar caché del navegador" (sin
           borrar "datos del sitio"/localStorage) no lo resolvía.
```

```
ID: TC-INI-05c
Caso: Modo Automático/Manual y animaciones por estación publicados afectan a
      todos los visitantes
Tipo: edge (regresión — antes estos campos no se publicaban)
Pre-condición: ninguna.
Pasos:
  1. Admin → Temas: activar "Automático", desactivar la animación de
     "Invierno" y Guardar para todos.
  2. Desde otro dispositivo/incógnito, abrir / durante un mes cuya estación
     detectada sea "Invierno".
Esperado: se aplica el tema de la estación detectada automáticamente y no se
          muestran partículas de invierno.
Resultado: ok (post-fix). Antes: `mode` y `animations` nunca se guardaban en
           `site_content`, así que sólo tenían efecto en el navegador del
           admin.
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

## Casos — Variantes Color y Talle precargadas (2026-10-04)

```
ID: TC-PROD-18
Caso: Alta de producto muestra Color y Talle precargadas
Tipo: happy
Pre-condición: sesión admin en /admin/products
Pasos:
  1. "Nuevo Producto" → pestaña Variantes.
Esperado: dos tarjetas, "Color" (con selector de colores) y "Talle" (con opciones),
          sin valores; el botón "+ Agregar variante" sigue visible.
Resultado: OK (Playwright 2026-10-04)

ID: TC-PROD-19
Caso: Se pueden agregar variantes extra además de las precargadas
Tipo: happy
Pasos:
  1. Nuevo Producto → Variantes → "+ Agregar variante".
Esperado: aparece una tercera tarjeta vacía; Color y Talle se mantienen.
Resultado: OK (Playwright 2026-10-04)

ID: TC-PROD-20
Caso: Editar producto sin variantes las precarga; guardar sin completarlas no persiste vacías
Tipo: edge
Pre-condición: producto existente con variants = []
Pasos:
  1. Editar el producto → Variantes.
  2. Guardar sin cargar colores ni talles.
Esperado: paso 1 muestra Color y Talle vacías; el payload del PUT /api/products/:id
          lleva `variants: []` y conserva el stock manual.
Resultado: OK (Playwright 2026-10-04, "Sandalia - Taco chino": variants [] / stock 2;
           PUT interceptado, sin escritura en la base)

ID: TC-PROD-21
Caso: Editar producto que ya tiene variantes muestra exactamente las guardadas
Tipo: edge
Pre-condición: producto con "Talle" (36 stock 2, 37 stock 3) y "color" (Rojo)
Pasos:
  1. Editar el producto → Variantes.
  2. Guardar sin cambios.
Esperado: exactamente esas dos tarjetas en ese orden, con sus valores y stock; sin
          copias de Color/Talle. El payload conserva Talle 36/37 con stock y color Rojo.
Resultado: OK (Playwright 2026-10-04, variantes inyectadas en la respuesta GET y PUT
           interceptado: no hay productos con variantes en la base y no se escribió en prod)

ID: TC-PROD-22
Caso: Variante estándar eliminada no reaparece
Tipo: edge
Pasos:
  1. Editar producto sin variantes → "Eliminar variante" en Color.
  2. Agregar el talle "39" en Talle → Guardar.
  3. Reabrir un producto guardado solo con Talle.
Esperado: payload con solo Talle ["39"]; al reabrir se ve solo Talle (Color NO vuelve,
          porque la precarga aplica solo a productos sin ninguna variante guardada).
Resultado: OK (Playwright 2026-10-04: payload [{Talle, ["39"]}]; producto inyectado con
           solo Talle 38 muestra únicamente Talle)

ID: TC-PROD-23
Caso: Precarga no altera el stock manual ni el modo de stock
Tipo: edge
Pasos:
  1. Nuevo producto o producto sin variantes → Datos Básicos.
Esperado: el campo sigue siendo "Stock disponible" editable (la tarjeta Talle vacía no
          activa el "Stock total" calculado).
Resultado: OK (revisión de código: `managesStockFromVariants` exige un talle con opciones;
           confirmado en TC-PROD-20, el payload respeta el stock manual)
```

---

## Casos — Tutorial de Variantes (Color y Talle) (2026-10-04)

```
ID: TC-PROD-24
Caso: Primer ingreso a Variantes auto-muestra el tutorial
Tipo: happy
Pre-condición: Admin que nunca descartó el tutorial (sin fila en admin_preferences).
Pasos:
  1. Login como admin nuevo.
  2. Productos → Nuevo producto → pestaña Variantes.
Esperado: Se abre solo el diálogo "Cómo configurar Color y Talle" con secciones Color, Talle, guía de calzado (35–42), guía de indumentaria (XS–XXL) y tip.
Resultado: no probado
```

```
ID: TC-PROD-25
Caso: Marcar "No volver a mostrar" y Entendido: no reaparece
Tipo: happy
Pre-condición: Tutorial abierto automáticamente.
Pasos:
  1. Marcar "No volver a mostrar este recordatorio".
  2. Tocar Entendido.
  3. Cerrar el modal de producto y abrir otro → Variantes.
Esperado: El botón muestra "Guardando…" y cierra; al volver a Variantes no se abre solo.
Resultado: no probado
```

```
ID: TC-PROD-26
Caso: La preferencia persiste tras logout/login
Tipo: happy
Pre-condición: TC-PROD-24 descartado con checkbox.
Pasos:
  1. Cerrar sesión.
  2. Iniciar sesión con el mismo admin.
  3. Abrir producto → Variantes.
Esperado: No se auto-muestra (preferencia guardada en admin_preferences).
Resultado: no probado
```

```
ID: TC-PROD-27
Caso: Otro admin nuevo sí lo ve
Tipo: edge
Pre-condición: Admin A descartó; admin B sin preferencia.
Pasos:
  1. Login como admin B.
  2. Abrir producto → Variantes.
Esperado: El tutorial se muestra a B (preferencia por admin).
Resultado: no probado
```

```
ID: TC-PROD-28
Caso: "Ver guía" abre aunque esté descartado
Tipo: happy
Pre-condición: Tutorial descartado.
Pasos:
  1. Abrir producto → Variantes.
  2. Tocar "Ver guía".
Esperado: El diálogo se abre siempre; cerrar con Entendido (sin checkbox) no modifica la preferencia.
Resultado: no probado
```

```
ID: TC-PROD-29
Caso: Fallo de red al guardar muestra error y no cierra
Tipo: failure
Pre-condición: Tutorial abierto.
Pasos:
  1. Cortar la red (DevTools offline).
  2. Marcar el checkbox y tocar Entendido.
Esperado: Aparece mensaje de error (role=alert), el diálogo sigue abierto, el botón vuelve a habilitarse para reintentar.
Resultado: no probado
```

```
ID: TC-PROD-30
Caso: Mobile 375px
Tipo: edge
Pre-condición: Viewport 375x667.
Pasos:
  1. Abrir tutorial.
  2. Scrollear el contenido.
  3. Verificar footer.
Esperado: Diálogo a pantalla completa, sin scroll horizontal, footer en columna, checkbox y botón con alto >= 44px.
Resultado: no probado
```

```
ID: TC-PROD-31
Caso: Teclado y Esc
Tipo: a11y
Pre-condición: Tutorial abierto.
Pasos:
  1. Navegar con Tab (checkbox, Entendido, X).
  2. Presionar Esc.
Esperado: Foco visible y atrapado en el diálogo; Esc cierra (con el estado del checkbox); el foco vuelve a la página.
Resultado: no probado
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
| Productos: variantes estándar | P18,P19 | P20,P21,P22,P23 |  |  |  |
| Productos: tutorial Variantes | P24,P25,P26,P28 | P27,P30 | P29 |  | P31 |
| Compra restringida (admin) | RESTRICT-01,RESTRICT-04 | RESTRICT-02 | RESTRICT-03 | RESTRICT-03 | |
| Catálogo público paginado | CAT-01,CAT-08 | CAT-02,CAT-05,CAT-06,CAT-07 | CAT-03,CAT-04 | CAT-09 | |
| Búsqueda del navbar | | SRCH-01,SRCH-02,SRCH-04 | SRCH-03 | | |
| Checkout idempotente | CHK-01 | CHK-02,CHK-03,CHK-04,CHK-05 | CHK-06 | | |
| apiFetch 503 AUTH_UNAVAILABLE | | | API-01,API-02 | API-03 | |
| Admin productos (caché) | | ADMPROD-01,ADMPROD-02,ADMPROD-03 | | | |
| Ventas (server-side) | SALES-01,SALES-03,SALES-08,SALES-14 | SALES-02,SALES-04,SALES-05,SALES-06,SALES-07,SALES-09,SALES-11,SALES-13 | SALES-10,SALES-12 | | |
| Despachos (server-side) | DESP-02,DESP-04 | DESP-03,DESP-06 | DESP-05 | | DESP-07 |

## Casos — Performance de carga mobile / MUI fuera del bundle crítico (2026-10-02)

Alcance: verificar que sacar MUI del camino crítico, cachear los fetchs de
configuración y diferir el WebSocket de Realtime **no cambiaron nada visual ni
funcional**. Pre-condición: `npm run build` + `npm run preview`.

```
ID: TC-PERF-01
Caso: MUI no entra en la carga inicial del Home
Tipo: happy
Pasos:
  1. npm run build && npm run preview
  2. Abrir el Home con DevTools → Network (throttle "Slow 4G")
  3. Mirar qué .js se piden antes del primer render
Esperado: la ola inicial NO incluye mui-*.js; aparece después, en idle.
          dist/index.html no lo lista como modulepreload.
Resultado: ok (Playwright, build de producción: ola crítica 217 kB a los 22ms;
           mui-*.js recién a los 85ms)

ID: TC-PERF-02
Caso: El reset global sigue computando igual sin CssBaseline
Tipo: edge
Pasos:
  1. En el Home, consola: getComputedStyle(document.body) y (document.documentElement)
  2. Comparar line-height, font-family/size/weight, color, background, margin,
     box-sizing de html y de un pseudo-elemento ::before, y font-weight de <strong>
Esperado: body line-height 24px (1.5), Poppins 16px/400, color rgb(51,51,51),
          fondo blanco, html box-sizing border-box y -webkit-text-size-adjust 100%,
          ::before border-box, strong 700.
Resultado: ok (idénticos al baseline medido antes del cambio)

ID: TC-PERF-03
Caso: Los componentes MUI conservan el theme de marca (no el default azul)
Tipo: happy
Pasos:
  1. Abrir el modal de login desde el navbar
  2. Entrar a /admin → Ventas (TextField, Pagination) y Productos → "Nuevo Producto"
Esperado: botones/acentos con el color de marca (no el azul #1976d2 de MUI),
          inputs con borderRadius 8px y tipografía Poppins (no Roboto 4px).
Resultado: ok (login, /admin/sales y modal de producto verificados)

ID: TC-PERF-04
Caso: Abrir el login no se siente lento pese a ser lazy
Tipo: edge
Pasos:
  1. Cargar el Home en mobile con throttle, esperar ~3s sin tocar nada
  2. Tocar "Iniciar sesión"
Esperado: el modal abre de inmediato (el chunk se precalentó en idle).
Resultado: no probado con throttle real — probar en dispositivo

ID: TC-PERF-05
Caso: La caché de categorías no deja ver datos viejos en el admin
Tipo: failure
Pre-condición: admin logueado. ⚠️ Escribe en la base: usar una categoría de prueba.
Pasos:
  1. /admin/products → "Nuevo Producto" → "Gestionar categorías"
  2. Crear una categoría nueva y verificar que aparece en el árbol al instante
  3. Borrarla y verificar que desaparece al instante
Esperado: alta y baja se reflejan sin esperar el TTL de 5 min (las mutadoras
          invalidan la caché).
Resultado: no probado — no se ejecutó para no crear datos en la base real

ID: TC-PERF-06
Caso: El color del navbar sigue actualizándose en vivo
Tipo: edge
Pasos:
  1. Abrir el Home en una pestaña y esperar unos segundos (la suscripción es diferida)
  2. En otra pestaña, /admin → Config. del sitio → cambiar el color de texto del navbar
Esperado: la primera pestaña toma el color nuevo sin recargar.
Resultado: no probado — requiere dos sesiones simultáneas
```

### Volteo de imagen en ProductCard (mobile)

```
ID: TC-CARDFLIP-01
Caso: Tap repetido sobre la misma card alterna la foto (mobile/touch)
Tipo: happy
Pre-condición: producto con 2+ imágenes y "imagen al hover" habilitada
Pasos:
  1. /products en un celular (o emulación táctil)
  2. Tocar la imagen de una card → muestra la 2ª foto
  3. Tocar de nuevo la misma imagen → vuelve a la 1ª
  4. Tocar otra vez → 2ª foto
Esperado: cada tap alterna entre las dos fotos.
Resultado: ok — Playwright (iPhone 12, Chromium emulado) 2026-10-04

ID: TC-CARDFLIP-02
Caso: Tocar otra card revierte la anterior
Tipo: happy
Pasos:
  1. Con una card volteada, tocar la imagen de otra card
Esperado: la primera vuelve a su foto principal y la segunda se voltea.
Resultado: ok — Playwright (iPhone 12, Chromium emulado) 2026-10-04

ID: TC-CARDFLIP-03
Caso: Card con una sola imagen o hover deshabilitado no reacciona al tap
Tipo: edge
Pasos:
  1. Tocar la imagen de un producto con 1 sola foto
Esperado: la imagen no cambia ni hace zoom.
Resultado: no probado

ID: TC-CARDFLIP-04
Caso: Desktop mantiene el comportamiento por hover
Tipo: edge
Pasos:
  1. 1440px con mouse: pasar sobre una card, salir; luego hacer click en la imagen y salir
Esperado: hover muestra la 2ª foto, al salir vuelve.
Resultado: ok — Playwright (1440px) 2026-10-04

ID: TC-CARDFLIP-05
Caso: Click en la foto de la card abre el detalle (solo desktop)
Tipo: happy
Pasos:
  1. 1440px con mouse: pasar sobre la foto de una card (cursor de mano)
  2. Click en la foto
Esperado: navega a /product/:id, igual que "Leer más". En mobile el tap NO navega,
          solo alterna la foto (TC-CARDFLIP-01).
Resultado: ok — Playwright (1440px → /product/18; iPhone 12 sin navegación) 2026-10-04
```

## Casos — Catálogo paginado, búsqueda, checkout idempotente, reintento ante 503 y paginación server-side del admin (2026-10-05/06)

> Estado de ejecución: **ningún caso de esta sección se ejecutó** (pasada solo de
> documentación, leyendo el código del working tree del 2026-10-06; Sales y Dispatches
> estaban siendo modificados por otro agente al momento de documentar, así que los casos
> `TC-SALES-*` / `TC-DESP-02..` describen el código leído ese día). El pedido original
> mencionaba verificaciones parciales con stubs: **no hay evidencia de ellas en el repo**
> (solo existe `e2e/stress-loading.spec.ts`, que no cubre estos casos), por eso todo figura
> como `no probado`. Quien los ejecute debe anotar fecha y método (stub / navegador real).
> Pre-condiciones comunes: front en `http://localhost:5173`, backend en `localhost:3000`,
> **más de 24 productos activos** para los casos de catálogo y **más de 50 ventas pagadas**
> para paginación de Ventas/Despachos; usuario estándar y usuario admin. Para los casos de
> checkout, el backend debe tener aplicados los scripts SQL del 2026-10-06 (ver
> `BACK/lia-store/docs/flows/flow-despliegue-produccion.md`).

### Catálogo público paginado (`/products`)

```
ID: TC-CAT-01
Caso: El catálogo carga 24 productos y ofrece "Ver más"
Tipo: happy
Pasos:
  1. Abrir /products como anónimo
  2. Contar las tarjetas
  3. Click en "Ver más"
Esperado: primera carga = 24 tarjetas ordenadas por fecha desc (desempate por id); aparece el
  botón "Ver más" solo si hay otra página; tras el click se agregan hasta 24 más sin
  borrar las anteriores y el botón muestra "Cargando..." deshabilitado mientras carga
Resultado: no probado

ID: TC-CAT-02
Caso: "Ver más" hasta agotar el catálogo, sin duplicados
Tipo: edge
Pasos:
  1. Repetir "Ver más" hasta que el botón desaparezca
  2. Contar tarjetas y comparar con el total de productos activos; buscar ids repetidos
Esperado: el botón desaparece cuando `hasMore` es falso; total = productos activos; ningún
  producto repetido (la lista se deduplica por id)
Resultado: no probado

ID: TC-CAT-03
Caso: Error en la primera carga muestra mensaje y "Reintentar"
Tipo: failure
Pasos:
  1. Con DevTools, bloquear las requests a Supabase (offline) y abrir /products
  2. Restaurar la red y click en "Reintentar"
Esperado: se ve "No pudimos cargar los productos. Revisá tu conexión y reintentá." con botón
  "Reintentar" (role="alert"); NO queda en skeleton infinito; al reintentar carga el catálogo
Resultado: no probado

ID: TC-CAT-04
Caso: Error al pedir "Ver más" conserva lo ya cargado
Tipo: failure
Pasos:
  1. Cargar la primera página y cortar la red
  2. Click en "Ver más"
  3. Restaurar la red y click en "Reintentar"
Esperado: las 24 tarjetas siguen visibles; aparece el mensaje de error y el botón pasa a
  "Reintentar"; al reintentar se agrega la página siguiente
Resultado: no probado

ID: TC-CAT-05
Caso: Cambiar de categoría con una carga en vuelo descarta la respuesta vieja
Tipo: edge
Pasos:
  1. Con throttling "Slow 3G", abrir /products?category=A y enseguida cambiar a ?category=B
  2. Esperar a que terminen ambas requests
Esperado: solo se ven productos de B (la respuesta de A se descarta por `requestId`); el
  estado de loading corresponde a la última selección
Resultado: no probado

ID: TC-CAT-06
Caso: Categoría sin productos muestra empty state
Tipo: edge
Pasos:
  1. Abrir /products?category=<categoría sin productos>
Esperado: "No hay productos en esta categoría." (sin botón "Ver más"); no se confunde con error
Resultado: no probado

ID: TC-CAT-07
Caso: Filtro por categoría incluye subcategorías y tolera el casing
Tipo: edge
Pre-condición: categoría con hijos y un producto cargado con la categoría en otro casing
Pasos:
  1. Abrir /products?category=<padre>
  2. Abrir ?subcategory=<hijo> y ?subsubcategory=<nieto>
  3. Probar un nombre de categoría con coma, paréntesis, comillas o `%`
Esperado: el padre incluye productos de sus descendientes; el filtro es case-insensitive
  (`ilike` sin comodines); los caracteres reservados de PostgREST se reemplazan por espacio y
  no rompen la consulta ni devuelven 400
Resultado: no probado

ID: TC-CAT-08
Caso: Estado de carga del catálogo (skeletons)
Tipo: happy
Pasos:
  1. Throttling "Slow 3G", abrir /products
Esperado: se ven los skeletons de las tarjetas (8) hasta que llega la primera página; "Ver
  más" no aparece mientras carga la primera página
Resultado: no probado

ID: TC-CAT-09
Caso: Un producto inactivo no aparece en el catálogo público
Tipo: security
Pasos:
  1. Desactivar un producto desde el admin
  2. Abrir /products como anónimo y paginar todo
Esperado: el producto inactivo no aparece (filtro `status = 'active'` + RLS `2026-09-15`)
Resultado: no probado
```

### Búsqueda del navbar

```
ID: TC-SRCH-01
Caso: Respuestas fuera de orden no pisan la búsqueda más reciente
Tipo: edge
Pasos:
  1. Con throttling, escribir "ab" (esperar el debounce de 300 ms) y enseguida "abc"
  2. Hacer que la respuesta de "ab" llegue después que la de "abc" (ej. con un breakpoint de red)
Esperado: el desplegable muestra siempre los resultados de la última consulta (`requestId`); el
  spinner se apaga solo cuando termina la última
Resultado: no probado

ID: TC-SRCH-02
Caso: Caracteres reservados en el término de búsqueda
Tipo: edge
Pasos:
  1. Buscar `a,b`, `(x)`, `50%`, `"a"` y `*`
  2. Buscar solo `,,,`
Esperado: no hay error 400 ni resultados absurdos; los caracteres `, ( ) % _ * "` se reemplazan
  por espacio; un término que queda vacío no dispara consulta (lista vacía)
Resultado: no probado

ID: TC-SRCH-03
Caso: Falla de red durante la búsqueda no deja el spinner colgado
Tipo: failure
Pasos:
  1. Cortar la red y escribir un término
Esperado: el spinner termina, la lista de resultados queda vacía y no se rompe la UI (el error
  va a consola)
Resultado: no probado

ID: TC-SRCH-04
Caso: Borrar el texto con una búsqueda en vuelo
Tipo: edge
Pasos:
  1. Escribir un término y, antes de que responda, borrar todo el campo
Esperado: el desplegable se cierra y la respuesta tardía no lo reabre
Resultado: no probado
```

### Checkout: sin espera artificial e idempotencia

```
ID: TC-CHK-01
Caso: El checkout se muestra sin la pantalla "Preparando tu compra..." artificial
Tipo: happy
Pre-condición: usuario logueado con producto en el carrito
Pasos:
  1. Ir a /checkout
Esperado: el formulario aparece de inmediato (ya no hay espera fija de 1.5 s); con sesión
  hidratada desde storage no se bloquea por `authInitialized`; sin usuario ni sesión
  inicializada se ve el loader de "Recuperando tu sesión..." hasta resolver
Resultado: no probado

ID: TC-CHK-02
Caso: Doble click en "Enviar comprobante por WhatsApp" (transferencia)
Tipo: edge
Pasos:
  1. Completar un checkout por transferencia
  2. Hacer doble click rápido en el botón principal
Esperado: se crea UNA sola orden (stock -1 solo una vez); el botón queda deshabilitado con
  el texto "Enviando pedido..." mientras la request está en vuelo; se abre WhatsApp una vez
Resultado: no probado

ID: TC-CHK-03
Caso: Doble click en "Continuar al pago" / "Ir a Mercado Pago"
Tipo: edge
Pasos:
  1. Completar un checkout con Mercado Pago, abrir el aviso de 15 minutos
  2. Doble click rápido en "Ir a Mercado Pago"
Esperado: una sola preferencia / un solo juego de órdenes; el botón del aviso queda
  deshabilitado mientras envía; el botón principal muestra "Redirigiendo a Mercado Pago..."
Resultado: no probado

ID: TC-CHK-04
Caso: Un reintento del mismo carrito reutiliza la Idempotency-Key; si el carrito cambia, se genera otra
Tipo: edge
Pasos:
  1. Con DevTools -> Network, enviar el checkout y forzar un error de red/timeout
  2. Reintentar sin tocar nada y comparar el header `Idempotency-Key` de ambas requests
  3. Cambiar la cantidad (o el envío, nombre o email) y reenviar
Esperado: paso 2 -> la misma key; paso 3 -> una key nueva (la huella incluye tipo de pago,
  items, envío, costo, total, nombre y email del comprador); la key cumple 8-128 caracteres
  `[A-Za-z0-9_-]` (UUID)
Resultado: no probado

ID: TC-CHK-05
Caso: La key se descarta tras un envío exitoso
Tipo: edge
Pasos:
  1. Completar una compra por transferencia con éxito
  2. Volver, armar el mismo carrito de nuevo y enviar
Esperado: la segunda compra usa una key distinta y crea órdenes nuevas (no devuelve las de la primera)
Resultado: no probado

ID: TC-CHK-06
Caso: Error 422 / 409 del backend se muestra en lenguaje humano
Tipo: failure
Pasos:
  1. Provocar `IDEMPOTENCY_KEY_REUSED` (misma key, carrito distinto) o un 409 de stock
Esperado: se ve el mensaje del backend ("... Volvé al carrito e iniciá una nueva compra." / "No
  hay stock suficiente de ...") en el cartel de error del checkout, sin códigos crudos; el
  botón se rehabilita
Resultado: no probado
```

### `apiFetch`: 503 `AUTH_UNAVAILABLE`

```
ID: TC-API-01
Caso: Un 503 AUTH_UNAVAILABLE reintenta una vez y NO cierra la sesión
Tipo: failure
Pasos:
  1. Con la sesión iniciada, interceptar (DevTools / proxy) la primera respuesta de una request
     protegida y devolver `503 { code: 'AUTH_UNAVAILABLE' }` con `Retry-After: 1`
  2. Dejar pasar la segunda
Esperado: `apiFetch` espera `Retry-After` (máx. 2 s; 1 s por defecto si falta) y reintenta una
  sola vez; la segunda respuesta se entrega normal; la sesión sigue activa (no se emite
  `auth:logout`, `tokenStorage` no se limpia ni se llama a `refreshSession`)
Resultado: no probado

ID: TC-API-02
Caso: Si el 503 persiste, el usuario ve un mensaje humano
Tipo: failure
Pasos:
  1. Hacer que las dos respuestas sean 503 AUTH_UNAVAILABLE durante un checkout
Esperado: el cartel muestra "El servicio está lento, reintentá en unos segundos."; sigue
  logueado; al reintentar manualmente (misma key si no cambió el carrito) funciona
Resultado: no probado

ID: TC-API-03
Caso: Un 401 real sigue refrescando la sesión; si el refresh falla, cierra sesión
Tipo: security
Pasos:
  1. Invalidar el access token y hacer una request protegida
  2. Repetir con el refresh token también inválido
Esperado: paso 1 -> refresca vía Supabase y reintenta una vez; paso 2 -> se emite
  `auth:logout` y se limpia la sesión; un 503 que no sea AUTH_UNAVAILABLE no se reintenta
Resultado: no probado
```

### Admin: lista de productos con caché

```
ID: TC-ADMPROD-01
Caso: Navegar entre Productos, Galería y Destacados no repite la lectura (caché de 30 s)
Tipo: edge
Pasos:
  1. Admin -> Productos (carga con `force: true`), luego abrir Destacados y la galería dentro de 30 s
  2. Mirar Network
Esperado: no hay una segunda lectura de `productos` dentro del TTL en los consumidores sin `force`;
  al volver a la pantalla Productos siempre recarga (force)
Resultado: no probado

ID: TC-ADMPROD-02
Caso: Crear, editar, borrar o destacar un producto invalida la caché
Tipo: edge
Pasos:
  1. Editar el precio de un producto y guardar
  2. Ir enseguida a Destacados / Galería
  3. Marcar un producto como destacado y volver a Productos
Esperado: nunca se ven datos previos a la acción; el `featured` nuevo se refleja
Resultado: no probado

ID: TC-ADMPROD-03
Caso: La galería (ProductGallery) lista solo productos activos
Tipo: edge
Pasos:
  1. Con un producto inactivo, abrir la galería de productos del admin
Esperado: el inactivo no aparece en la galería (se filtra `status === 'active'`), pero sí en la tabla de Productos
Resultado: no probado
```

### Ventas (`/admin/sales`) — paginación, filtros y orden en servidor

```
ID: TC-SALES-01
Caso: Paginación de 50 filas con total correcto
Tipo: happy
Pasos:
  1. Abrir /admin/sales con más de 50 ventas
  2. Ir a la página 2 y a la última
Esperado: 50 filas por página; el paginador (MUI) aparece solo si hay más de una página; el
  total de páginas sale del `count` exacto del servidor; la última página trae el resto
Resultado: no probado

ID: TC-SALES-02
Caso: Filtro por estado de pago, incluyendo "Pendiente" y "Expirado" efectivos
Tipo: edge
Pre-condición: una venta MP 'pendiente' de hace > 15 min (aún sin barrer) y una de transferencia 'pendiente' reciente
Pasos:
  1. Filtrar "Pendiente"
  2. Filtrar "Expirado"
Esperado: "Pendiente" excluye la MP vencida (se ve como expirada) y conserva la transferencia
  reciente; "Expirado" incluye las 'expirado' reales y las pendientes vencidas (MP > 15 min,
  transferencia > 5 h); la lista coincide con el badge que muestra cada fila
Resultado: no probado
Notas: el selector no ofrece "Cancelado" (las órdenes canceladas se ven en la lista sin filtro).

ID: TC-SALES-03
Caso: Filtro por método de pago
Tipo: happy
Pasos:
  1. Elegir "Mercado Pago", luego "Transferencia", luego "Todos los métodos"
Esperado: la lista y el total de páginas reflejan el filtro; vuelve a la página 1 al cambiar
Resultado: no probado

ID: TC-SALES-04
Caso: Filtro por stock ("Stock bajo (≤5)" / "Sin stock")
Tipo: edge
Pasos:
  1. Elegir "Sin stock" y luego "Stock bajo (≤5)"
  2. Repetir cuando ningún producto cumple la condición
Esperado: solo ventas de productos con esas condiciones (se resuelven los ids en `productos`
  y se filtra con `.in()`, tope 500 ids); si ningún producto cumple, empty state sin llamar a ventas
Resultado: no probado

ID: TC-SALES-05
Caso: Búsqueda con debounce y saneo de caracteres reservados
Tipo: edge
Pasos:
  1. Escribir un producto/comprador/email y mirar Network
  2. Buscar `juan_perez@x.com` (con guion bajo) y luego `a,b(c)%*"`
Esperado: una sola consulta ~300 ms después de dejar de tipear; busca en producto, comprador y
  email (ilike); `_` se conserva (permite emails), `, ( ) % * "` se reemplazan por espacio sin error 400
Resultado: no probado

ID: TC-SALES-06
Caso: Ordenar por columna sin duplicar ni omitir filas entre páginas
Tipo: edge
Pre-condición: varias ventas con el mismo valor en la columna (ej. mismo método de pago)
Pasos:
  1. Ordenar por "Método pago" asc y recorrer las páginas
  2. Click de nuevo para desc; probar Comprador, Fecha, Cant., Total, Envío y Estado
Esperado: el orden es estable (desempate por id); ninguna venta aparece dos veces ni falta
  entre páginas; los nulos van al final
Resultado: no probado

ID: TC-SALES-07
Caso: Cambiar filtros, búsqueda u orden vuelve a la página 1
Tipo: edge
Pasos:
  1. Ir a la página 3 y cambiar cualquier filtro/orden/búsqueda
Esperado: vuelve a la página 1 sin disparar antes una consulta con la página vieja
Resultado: no probado

ID: TC-SALES-08
Caso: Estado de carga
Tipo: happy
Pasos:
  1. Throttling "Slow 3G", abrir /admin/sales
Esperado: se ve el loader con "Cargando ventas..." en la tabla; los contadores muestran "—"
  hasta resolver
Resultado: no probado

ID: TC-SALES-09
Caso: Estado vacío con y sin filtros
Tipo: edge
Pasos:
  1. Filtrar de modo que no haya resultados
  2. En una base sin ventas, abrir la pantalla
Esperado: con filtros -> "No hay ventas que coincidan con los filtros" + sugerencia de limpiar;
  sin filtros -> "Todavía no hay ventas registradas"
Resultado: no probado

ID: TC-SALES-10
Caso: Error de carga con "Reintentar"
Tipo: failure
Pasos:
  1. Cortar la red y abrir /admin/sales (o hacer clic en "Actualizar")
  2. Restaurar y click en "Reintentar"
Esperado: se ve "No pudimos cargar las ventas" (role="alert") con botón "Reintentar"; al
  reintentar recarga tabla y contadores
Resultado: no probado

ID: TC-SALES-11
Caso: Contadores globales independientes de filtros y de la página
Tipo: edge
Pasos:
  1. Aplicar filtros y paginar; mirar "Total ventas", "Pendientes de pago", "Pagadas", "Con producto sin stock"
  2. Hacer fallar solo la consulta de contadores
Esperado: los contadores no cambian al filtrar/paginar (son `count` exacto de toda la tabla;
  "Pendientes" usa el estado efectivo); si fallan quedan en "—" y la tabla sigue visible; las
  alertas de stock (productos activos con stock <= 5) se ocultan si fallan
Resultado: no probado
Notas: reemplaza la inconsistencia reportada en "Hallazgos abiertos" (stats que no cuadraban
  con la lista) — verificar si queda resuelta.

ID: TC-SALES-12
Caso: Página fuera de rango tras borrarse filas (416 / PGRST103)
Tipo: failure
Pasos:
  1. Estar en la última página y reducir las filas (ej. cancelar/filtrar de modo que la página deje de existir)
  2. Refrescar
Esperado: ante el error `PGRST103` con página > 1 vuelve automáticamente a la página 1, sin mostrar error
Resultado: no probado

ID: TC-SALES-13
Caso: Respuestas fuera de orden al cambiar filtros rápido
Tipo: edge
Pasos:
  1. Con throttling, cambiar dos veces el filtro de estado seguidas y forzar que la respuesta del primero llegue última
Esperado: la tabla refleja el último filtro (descarta respuestas viejas por `requestId`)
Resultado: no probado

ID: TC-SALES-14
Caso: Confirmar / cancelar una transferencia refresca tabla y contadores
Tipo: happy
Pasos:
  1. En una venta de transferencia 'pendiente' elegir "Pagado" y confirmar el diálogo
  2. Repetir con "Cancelado" en otra
Esperado: tras el OK del backend (PATCH confirm-transfer / cancel-transfer) se recarga la
  página actual y los contadores; si el backend responde error, se muestra su mensaje
Resultado: no probado
```

### Despachos (`/admin/dispatches`) — paginación y filtros en servidor

```
ID: TC-DESP-02
Caso: Paginación de 50 pedidos pagados con total correcto
Tipo: happy
Pasos:
  1. Abrir /admin/dispatches con más de 50 ventas pagadas
  2. Ir a la página 2
Esperado: 50 filas por página, solo ventas `payment_status = 'pagado'`, orden por fecha desc
  (desempate por id) y paginador visible solo si hay más de una página (antes se traían hasta
  1000 y se paginaba en el cliente)
Resultado: no probado

ID: TC-DESP-03
Caso: Filtros por envío y por estado; "Pendiente" incluye dispatch_status NULL
Tipo: edge
Pre-condición: pedidos con `dispatch_status` NULL en la base
Pasos:
  1. Filtrar "Pendiente"
  2. Combinar con "Retiro en local", "Envío por moto" y "Correo Argentino"
  3. Probar "Despachado", "Listo para retiro" y "Entregado"
Esperado: "Pendiente" trae los 'pendiente' y los NULL (mostrados como Pendiente); los filtros
  se combinan; cambiar cualquiera vuelve a la página 1
Resultado: no probado

ID: TC-DESP-04
Caso: Cambiar el estado de despacho persiste y refresca
Tipo: happy
Pre-condición: script `2026-10-06_ventas_restrict_update.sql` aplicado
Pasos:
  1. Como admin, cambiar un pedido a "En preparación" y otro a "Despachado" (o "Listo para retiro" si es retiro en local)
Esperado: el cambio se guarda (única columna que el cliente puede actualizar), la tabla y los
  contadores se recargan, y `dispatched_at` queda seteado al pasar a despachado
Resultado: no probado
Notas: si el UPDATE falla (ej. permisos), el código actual no muestra ningún mensaje
  (`if (!error) refreshAll()`): el select vuelve al valor anterior sin aviso. Ver hallazgo H-DESP-SILENT.

ID: TC-DESP-05
Caso: Estados loading / empty / error de Despachos
Tipo: failure
Pasos:
  1. Throttling y abrir la pantalla (loader "Cargando despachos...")
  2. Filtrar sin resultados / base sin pedidos pagados
  3. Cortar la red y recargar; luego "Reintentar"
Esperado: loader -> lista; empty con filtros ("No hay pedidos que coincidan con los filtros") y
  sin filtros ("Todavía no hay pedidos pagados"); error "No pudimos cargar los despachos" con "Reintentar"
Resultado: no probado

ID: TC-DESP-06
Caso: Contadores de Despachos independientes de filtros
Tipo: edge
Pasos:
  1. Aplicar filtros y paginar; mirar "Total pedidos", "Pendientes", "En preparación", "Despachados / Listos"
Esperado: son conteos globales (`count` exacto sobre ventas pagadas; "Pendientes" incluye NULL;
  "Despachados / Listos" suma `despachado` y `listo_para_retiro`); si fallan quedan en "—"
Resultado: no probado

ID: TC-DESP-07
Caso: Despachos en mobile 375 px con paginación
Tipo: a11y
Pasos:
  1. Abrir /admin/dispatches a 375 px con más de 50 pedidos
Esperado: tarjetas (no tabla), select de estado usable, paginador sin desborde horizontal
Resultado: no probado
```

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

### Hallazgos de la pasada de documentación (2026-10-06, por lectura de código; sin reproducir)

| ID | Severidad | Estado | Descripción | Caso |
|----|-----------|--------|-------------|------|
| H-DESP-SILENT | 🟡 Medio | ABIERTO | `Dispatches.handleChangeDispatchStatus` ignora el error del UPDATE (`if (!error) refreshAll()`): si falla (permisos tras `2026-10-06_ventas_restrict_update.sql`, red, RLS) el admin no recibe ningún aviso | TC-DESP-04 |
| H-SALES-ALERT | 🟢 Bajo | ABIERTO | `Sales` informa errores de confirmar/cancelar con `alert()` del navegador en vez del sistema global de feedback | TC-SALES-14 |
| H-SALES-FILTER | 🟢 Bajo | ABIERTO | El filtro de estado de Ventas no ofrece "Cancelado" (el tipo `payment_status` sí lo incluye) | TC-SALES-02 |
| H-KEY-FINGERPRINT | 🟢 Info | Documentado | La huella de la Idempotency-Key del front incluye nombre y email del comprador y el total; la del backend no (solo productos, cantidades, variantes, envío y medio de pago). Un cambio de nombre genera key nueva pero el backend lo trataría como el mismo carrito: dos órdenes si el primer intento ya había commiteado | TC-CHK-04 |

## Casos — Vista previa de producto del admin (2026-10-06)

ID: TC-PREV-01 — Caso: "Ver vista previa" no persiste nada. Tipo: happy. Pasos: Editar producto → cambiar precio → Ver vista previa (→ "Continuar igualmente" si faltan datos). Esperado: URL `/admin/products/preview` con el precio nuevo; al cancelar y recargar la lista el precio sigue igual. Resultado: ok (Chrome 1440px).
ID: TC-PREV-02 — Caso: "Editar producto" reabre el modal con el borrador (precio modificado) y limpia el state. Tipo: happy. Resultado: ok.
ID: TC-PREV-03 — Caso: "Confirmar" guarda y vuelve a la lista (datos originales). Tipo: happy. Resultado: ok.
ID: TC-PREV-04 — Caso: Vista Detalle usa el detalle real; compra no navega ni toca el carrito. Tipo: happy. Resultado: ok (render); clicks de compra no probados.
ID: TC-PREV-05 — Caso: responsive 320/375/768/1024/1440 sin scroll horizontal. Tipo: a11y/responsive. Resultado: ok (medido, solo Chrome).
ID: TC-PREV-06 — Caso: crear producto nuevo → preview → Confirmar lo crea. Tipo: happy. Resultado: ok (producto de prueba creado y eliminado).
ID: TC-PREV-07 — Caso: Confirmar con 500 muestra error (role=alert), no navega y permite reintentar; doble click = 1 request. Tipo: failure/concurrencia. Resultado: ok.
ID: TC-PREV-08 — Caso: `/admin/products/preview` en frío redirige a Productos; reload en la preview conserva el borrador. Tipo: edge. Resultado: ok.
ID: TC-PREV-09 — Caso: regresión del detalle público `/product/:id` (carga, variantes, carrito, id inexistente). Tipo: edge. Resultado: ok (cantidad máx. >1 no probada: el stock por talle es 1).
ID: TC-PREV-10 — Caso: mobile 375px sin botón flotante del asistente en la preview y sin scroll horizontal. Tipo: responsive. Resultado: ok.
ID: TC-PREV-11 — Caso: poner descuento 0 quita la promo (original_price y discount quedan null; la tienda sin tachado). Tipo: edge. Resultado: ok.
ID: TC-PRICE-01 — Caso: bajar precio 1000→800: se guarda price 800, original_price 1000, discount 20; tienda muestra 1.000 tachado / 800,00 exacto. Tipo: happy. Resultado: ok.
ID: TC-PRICE-02 — Caso: redondeo (10000→7999, 20.01%): final exacto $7.999,00 en tienda y carrito. Tipo: edge. Resultado: ok.
ID: TC-PRICE-03 — Caso: producto legado id 16 (solo discount 90) sin tocar precio mantiene $59.000 tachado / $5.900. Tipo: edge. Resultado: ok.
ID: TC-PRICE-04 — Caso: re-promo sobre producto guardado (800→700) usa 800 como original (12.5%). Tipo: happy. Resultado: ok.
ID: TC-PRICE-05 — Caso: checkout real (MP/transferencia) cobra el final mostrado. Tipo: happy. Resultado: no probado (solo lectura de código: resolveUnitPrice = pricing.ts).
