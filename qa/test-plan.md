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

### Opciones de card por producto (2026-10-23)

> Requiere la columna `productos.card_options` (jsonb) y el soporte del backend en POST/PUT `/products` (`cardOptions`).
> Contrato: `null` = usar opciones globales; `[]` = sin sellos; array de `{ label, icon, isActive }` (máx 10, el orden es el de display).

```
ID: TC-CARDOPT-11
Caso: Crear producto con opciones propias
Tipo: happy
Pre-condición: admin logueado; existen opciones globales activas.
Pasos:
  1. Productos > Nuevo producto > pestaña Promociones.
  2. Desactivar "Usar opciones globales".
  3. Añadir "Retiro gratis" (ícono store) y "3 cuotas" (ícono credit-card).
  4. Completar datos básicos > Ver vista previa > Confirmar.
Esperado: la Vista Card y el catálogo público muestran SOLO esos dos sellos, en ese orden; no aparecen los globales.
Resultado: no probado
```

```
ID: TC-CARDOPT-12
Caso: Editar las opciones propias (texto, ícono, activar/desactivar, orden, eliminar)
Tipo: happy
Pre-condición: producto con 3 opciones propias.
Pasos:
  1. Editar el producto > Promociones.
  2. Editar el texto y el ícono de una opción (lápiz > tilde).
  3. Desactivar otra; reordenar arrastrando y con los botones Subir/Bajar; eliminar la tercera.
  4. Ver vista previa > Confirmar.
Esperado: la card muestra solo las activas, en el nuevo orden; al reabrir el modal se cargan tal cual se guardaron (incluidas las inactivas).
Resultado: no probado
```

```
ID: TC-CARDOPT-13
Caso: Volver a opciones globales
Tipo: happy
Pre-condición: producto con opciones propias.
Pasos:
  1. Editar > Promociones > activar "Usar opciones globales".
  2. En el diálogo elegir "Descartar y usar globales" (probar también "Conservar mis opciones").
  3. Ver vista previa > Confirmar.
Esperado: "Conservar" deja el toggle apagado y la lista intacta; "Descartar" oculta el editor; al guardar se envía `cardOptions: null` explícito, la columna queda NULL y la card vuelve a mostrar las globales (incluso si cambian después).
Resultado: no probado
```

```
ID: TC-CARDOPT-14
Caso: Producto con lista vacía [] no muestra sellos
Tipo: edge
Pasos:
  1. Editar > Promociones > desactivar "Usar opciones globales" sin añadir ninguna opción.
  2. Guardar (o dejar todas las propias inactivas).
Esperado: el editor muestra el estado vacío con CTA; la card NO muestra sellos ni espacio reservado, aunque existan globales activas.
Resultado: no probado
```

```
ID: TC-CARDOPT-15
Caso: Límite de 10 opciones
Tipo: edge
Pasos:
  1. Añadir 10 opciones propias.
  2. Intentar añadir la 11.
Esperado: el input y "Añadir opción" quedan deshabilitados y se lee "Llegaste al máximo de 10 opciones"; al eliminar una se vuelve a habilitar.
Resultado: no probado
```

```
ID: TC-CARDOPT-16
Caso: Validación del texto (vacío, solo espacios, duplicado, 40+, emoji)
Tipo: edge
Pasos:
  1. Pulsar "Añadir opción" con el campo vacío y con solo espacios.
  2. Añadir "Envío gratis" y luego " envío GRATIS ".
  3. Pegar un texto de 60 caracteres.
  4. Añadir "Oferta 🔥" y editar una opción dejándola vacía o igual a otra.
Esperado: (1) error inline "Escribí el texto de la opción." sin agregar; (2) "Ya existe una opción con ese texto."; (3) el campo corta en 40 y el contador muestra 40/40; (4) el emoji se guarda y se muestra en la card; la edición inválida muestra el error y no se guarda.
Resultado: no probado
```

```
ID: TC-CARDOPT-17
Caso: Doble click / doble submit
Tipo: edge
Pasos:
  1. Escribir un texto y pulsar "Añadir opción" (o Enter) dos veces rápido.
  2. Pulsar dos veces "Confirmar" en la vista previa.
Esperado: la segunda alta del mismo texto se rechaza por duplicado (queda una sola); "Confirmar" no crea dos productos (comportamiento existente).
Resultado: no probado
```

```
ID: TC-CARDOPT-18
Caso: Editor en mobile 320/375px
Tipo: a11y / responsive
Pasos:
  1. Viewport 375×812 (y 320) > admin > editar producto > Promociones.
  2. Operar el editor solo con teclado (Tab, Enter, Espacio, Esc en edición).
Esperado: sin scroll horizontal; botones de al menos 36px; foco visible en toggle, input, íconos y acciones; cada botón tiene aria-label; Esc cancela la edición inline; los errores se anuncian (role="alert").
Resultado: no probado
```

```
ID: TC-CARDOPT-19
Caso: Anónimo ve solo las opciones activas del producto
Tipo: security / happy
Pre-condición: producto A con propias (una inactiva), producto B con null.
Pasos:
  1. Sin sesión, abrir Home y /products.
Esperado: A muestra solo sus activas en su orden; B muestra las globales; el detalle del producto no cambia. Un `card_options` malformado en la base se trata como null (globales).
Resultado: no probado
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
| Checkout: formas de entrega (sin moto) | SHIP-01,SHIP-02,SHIP-03 | SHIP-05 | SHIP-04 | | SHIP-01 |
| Catálogo de talles | TC-SIZE-01,TC-SIZE-03,TC-SIZE-07,TC-SIZE-35,TC-SIZE-37,TC-SIZE-38,TC-SIZE-39,TC-SIZE-40,TC-SIZE-41,TC-SIZE-42,TC-SIZE-45,TC-SIZE-46,TC-SIZE-47,TC-SIZE-51,TC-SIZE-53 | TC-SIZE-02,TC-SIZE-05,TC-SIZE-36,TC-SIZE-43,TC-SIZE-44,TC-SIZE-48,TC-SIZE-49,TC-SIZE-50,TC-SIZE-54 | TC-SIZE-04,TC-SIZE-52 | TC-SIZE-08 | TC-SIZE-24,TC-SIZE-55 |
| Checkout: rediseño por pasos (stepper) | CHKUI-01,CHKUI-02,CHKUI-07,CHKUI-12 | CHKUI-03,CHKUI-04,CHKUI-05,CHKUI-06,CHKUI-11,CHKUI-16 | CHKUI-09,CHKUI-10,CHKUI-15 | CHKUI-08 | CHKUI-02,CHKUI-04,CHKUI-13,CHKUI-14 |

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
  2. Combinar con "Retiro en local" y "Correo Argentino" (la opción "Envío por moto" se eliminó el 2026-10-08, ver TC-SHIP-05)
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
| H-KEY-FINGERPRINT | 🟢 Info | Resuelto (2026-10-08) | La huella del backend ahora incluye nombre y email del comprador además de items, envío, costo y total, igual que la del front. Un cambio de nombre/email genera key nueva y es otra compra (la orden pendiente anterior expira sola); reusar una key con otro comprador da 422 | TC-CHK-04 |

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

ID: TC-STOCK-01 — Caso: sidebar muestra "Stock" y abre `/admin/stock` con skeleton/loader, luego tabla (desktop) o tarjetas (<768px). Tipo: happy. Resultado: no probado.
ID: TC-STOCK-02 — Caso: filtros combinados (nombre, nivel En stock/Bajo/Sin stock, categoría, estado) y orden por columna; cambiar un filtro vuelve a página 1. Tipo: happy. Resultado: no probado.
ID: TC-STOCK-03 — Caso: producto con talles muestra la suma de `stockByOption` (igual que Productos), no la columna `stock`. Tipo: edge. Resultado: no probado.
ID: TC-STOCK-04 — Caso: sin resultados (empty con filtros / sin productos) y error de red con "Reintentar". Tipo: failure. Resultado: no probado.
ID: TC-STOCK-05 — Caso: Ventas ya no muestra "Alertas de stock"; contadores y filtro de stock de Ventas siguen funcionando. Tipo: regresión. Resultado: no probado.

## Casos — Eliminación de "Envío por moto" (2026-10-08)

> Se quitó la opción de envío por moto del checkout junto con su modal de domicilio, la
> búsqueda de localidad por código postal (mapas CABA/GBA + API GeoRef) y la validación de
> zonas AMBA/restringidas. Formas de entrega vigentes: "Retiro en local" (por defecto, gratis)
> y "Correo Argentino" (visible pero deshabilitada).

ID: TC-SHIP-01 — Caso: /checkout muestra solo "Correo Argentino" (deshabilitada) y "Retiro en local" (seleccionada por defecto); no aparece "Envío por moto" ni "Ingresá tu domicilio de entrega". Tipo: happy/a11y. Pasos: login → producto → comprar → /checkout a 320/375/768/1440 px; navegar con Tab hasta los radios de envío. Esperado: resumen "Envío: Gratis", total = subtotal, botón "Continuar al pago" habilitado sin pedir domicilio; sin scroll horizontal. Resultado: no probado (solo build).
ID: TC-SHIP-02 — Caso: Mercado Pago con retiro en local. Tipo: happy. Pasos: /checkout → "Pagar con Mercado Pago" → "Continuar al pago" → aviso 15 min (modal sigue con su estilo: bottom sheet en mobile, centrado ≥600px) → "Ir a Mercado Pago". Esperado: `POST /api/orders/mp-preference` con `shippingMethod: 'local'`, `shippingCost: 0`; redirige a MP. Resultado: no probado.
ID: TC-SHIP-03 — Caso: transferencia con retiro en local. Tipo: happy. Pasos: elegir "Transferencia por alias" → "Enviar comprobante por WhatsApp". Esperado: `POST /api/orders/transfer` con `shippingMethod: 'local'`; el mensaje de WhatsApp dice "Envío: Gratis (Retiro en local)" y "Método de entrega: Retiro en local", sin línea de domicilio. Resultado: no probado.
ID: TC-SHIP-04 — Caso: checkout sin red / backend caído tras quitar moto. Tipo: failure. Pasos: cortar el backend y "Continuar al pago" / enviar transferencia. Esperado: mismo error humano que antes ("No se pudo conectar con el sistema de pagos..." / "No se pudo iniciar la compra..."), botón re-habilitado. Resultado: no probado.
ID: TC-SHIP-05 — Caso: datos históricos con `shipping_method = 'moto'`. Tipo: edge. Pasos: con una venta pagada previa con moto, abrir /admin/dispatches, /admin/sales y "Mis compras". Esperado: el filtro de Despachos ya no ofrece "Envío por moto"; la fila se muestra con el valor crudo "moto" e ícono genérico, y su estado de despacho ofrece "Despachado" (no "Listo para retiro"). Resultado: no probado.

## Casos — Checkout rediseñado por pasos (2026-10-08)

> Stepper Carrito → Entrega → Pago con dos vistas reales (`/checkout` y `/checkout?paso=pago`),
> resumen sticky / colapsable y paleta azul petróleo. La lógica de pago (payloads, idempotencia,
> `mp_*` en sessionStorage, nudge, aviso de 15 min) no cambia: los casos TC-SHIP-02/03 y CHK-*
> siguen vigentes, pero ahora se llega al CTA de pago pasando por "Continuar para el pago".
> Verificación automatizada local: Playwright (Chromium) contra `vite` con Supabase/backend
> mockeados (sin red real), sesión y carrito sembrados en localStorage. No se envió ningún pedido.

ID: TC-CHKUI-01 — Caso: render inicial en Entrega. Tipo: happy. Pasos: login → producto → comprar → /checkout. Esperado: stepper con Carrito completado (✓, texto sr-only "completado"), Entrega activo (`aria-current="step"`), Pago pendiente; "Datos de contacto" con el e-mail de la cuenta en solo lectura; "Retiro en local" preseleccionado; "Continuar para el pago" habilitado. Resultado: ok (Chromium, entorno mockeado).
ID: TC-CHKUI-02 — Caso: avanzar a Pago. Tipo: happy/a11y. Pasos: "Continuar para el pago" (click o Enter en un campo). Esperado: URL `?paso=pago`, foco en el h2 "Pago", `aria-live` anuncia "Paso 3 de 3: Pago", stepper con Entrega completado. Resultado: ok (375 y 1440 px).
ID: TC-CHKUI-03 — Caso: botón atrás del navegador desde Pago. Tipo: edge. Pasos: en Pago elegir "Transferencia por alias" → atrás del navegador → adelante. Esperado: vuelve a Entrega (URL sin `paso`, foco en "Datos de contacto"); al ir adelante sigue elegida Transferencia (no se pierden datos). Resultado: ok.
ID: TC-CHKUI-04 — Caso: "Modificar" desde Pago. Tipo: edge/a11y. Pasos: en Pago → "Modificar". Esperado: vuelve a Entrega sin agregar una entrada extra al historial (equivale a atrás). Resultado: ok.
ID: TC-CHKUI-05 — Caso: entrada directa por URL a `/checkout?paso=pago`. Tipo: edge. Pasos: con sesión y carrito válidos abrir la URL en una pestaña nueva / recargar. Esperado: abre en Pago; sin datos válidos (p. ej. precio inválido) reemplaza la URL por Entrega y muestra el motivo. Resultado: ok (caso válido); caso inválido no probado.
ID: TC-CHKUI-06 — Caso: perfil sin nombre. Tipo: edge. Pasos: usuario cuyo `profiles.name` está vacío → /checkout. Esperado: aparece "Nombre y apellido" (requerido); "Continuar para el pago" deshabilitado con el motivo "Completá tu nombre y apellido para continuar."; al completarlo se habilita y el nombre se conserva al volver de Pago. Resultado: ok.
ID: TC-CHKUI-07 — Caso: Mercado Pago desde el paso Pago. Tipo: happy. Pasos: Pago → "Pagar con Mercado Pago" → "Continuar al pago" → aviso de 15 min → "Ir a Mercado Pago". Esperado: igual que TC-SHIP-02 (payload, `Idempotency-Key`, `mp_last_order`/`mp_order_ids`, redirección). Resultado: aviso ok (abre `role="dialog"`, Escape lo cierra y devuelve el foco al CTA); redirección real no probada (sin backend).
ID: TC-CHKUI-08 — Caso: e-mail de contacto no editable. Tipo: security. Pasos: intentar editar el campo E-mail; inspeccionar el body de `POST /orders/transfer` y `/orders/mp-preference`. Esperado: campo `readonly`; `buyerEmail` = e-mail de la sesión (clave de "Mis compras" y de la autorización de cancel/nudge). Resultado: readonly ok; body no probado (sin backend).
ID: TC-CHKUI-09 — Caso: error del backend en Pago. Tipo: failure. Pasos: cortar el backend y "Continuar al pago" → "Ir a Mercado Pago" / "Enviar comprobante por WhatsApp". Esperado: mensaje humano en un bloque `role="alert"` arriba del CTA; CTA re-habilitado; reintentar reutiliza la misma `Idempotency-Key`. Resultado: no probado.
ID: TC-CHKUI-10 — Caso: precio inválido. Tipo: failure. Pasos: producto con precio 0 en el carrito → /checkout. Esperado: "Continuar para el pago" deshabilitado con el mensaje de precio inválido visible; `?paso=pago` redirige a Entrega. Resultado: no probado.
ID: TC-CHKUI-11 — Caso: variantes distintas por unidad en el resumen. Tipo: edge. Pasos: 2 unidades con talle/color distintos → /checkout. Esperado: el resumen lista "Unidad 1"/"Unidad 2" con sus tags (color con muestra); con variantes iguales, una sola fila. Resultado: ok (por unidad); fila única no probada.
ID: TC-CHKUI-12 — Caso: usuario sin sesión. Tipo: happy. Pasos: sin login → /checkout con carrito. Esperado: "Tenés que iniciar sesión para continuar con la compra." + botón pill "Iniciar sesión" que abre el modal de auth. Resultado: ok (render; login real no probado).
ID: TC-CHKUI-13 — Caso: responsive. Tipo: a11y/responsive. Pasos: 320, 375, 768, 1024, 1440 px en Entrega y Pago. Esperado: sin scroll horizontal; <992 px una columna con resumen colapsable ("Ver resumen" + total) arriba; ≥992 px dos columnas con resumen sticky a la derecha; targets ≥44 px. Resultado: ok (scrollWidth = clientWidth en los 5 anchos; solo Chromium).
ID: TC-CHKUI-14 — Caso: teclado. Tipo: a11y. Pasos: Tab por toda la vista de Entrega y Pago. Esperado: foco visible en el toggle del resumen, inputs, radios (flechas cambian la opción), "Modificar" y CTA; Correo Argentino no seleccionable y con motivo "Temporalmente no disponible." leído vía `aria-describedby`. Resultado: no probado manualmente.
ID: TC-CHKUI-15 — Caso: recarga en frío de /checkout. Tipo: failure (regresión). Pasos: con sesión y carrito, recargar `/checkout` o `/checkout?paso=pago`. Esperado: la pantalla de carga inicial desaparece y se ve el paso (antes quedaba colgada). Resultado: ok.
ID: TC-CHKUI-16 — Caso: paleta global vs temas del admin. Tipo: edge. Pasos: Admin → Temas: aplicar "Rosa", "Esmeralda" y un tema personalizado; recorrer home, catálogo, detalle, carrito, checkout. Esperado: botones/acentos tematizados (`--primary-*`, `--button-dark`, `--brand-green`) siguen el tema; texto general y CTA del checkout en azul petróleo, legibles. Resultado: no probado (sin Supabase).

ID: TC-CHKUI-17 — Caso: aviso previo muestra hora límite. Tipo: happy. Pasos: checkout → "Pagar con Mercado Pago" → "Continuar al pago". Esperado: el aviso dice "15 minutos (hasta las HH:MM)" con HH:MM = ahora + 15 min. Resultado: no probado.
ID: TC-CHKUI-18 — Caso: volver a /checkout con el plazo vencido. Tipo: edge. Pasos: ir a Mercado Pago, esperar más de 15 min (o editar `mp_deadline` en sessionStorage a un valor pasado), volver con Atrás a `/checkout`. Esperado (actualizado 2026-10-12): "Liberando tu reserva anterior…" con el pago bloqueado; si `mp-cancel` responde `released`, banner rojo "Se venció el tiempo para pagar…" y se borran `mp_order_ids`/`mp_deadline`/`mp_owner`/`mp_last_order`; el carrito sigue intacto. Con `held`/`error` NO aparece ese banner. Resultado: no probado.
ID: TC-CHKUI-19 — Caso: volver a /checkout con Atrás antes de los 15 min y reintentar con 1 unidad en stock. Tipo: edge. Pasos: ir a Mercado Pago y volver con Atrás sin pagar; verificar en `ventas` la orden anterior y el stock; volver a "Continuar al pago". Esperado (actualizado 2026-10-12): `POST /orders/mp-cancel` (un solo request con todos los ids) → `released`; sin banner; la orden anterior queda `cancelado`, stock restaurado una vez; el reintento NO da 409 y genera una orden nueva. Resultado: no probado.
ID: TC-CHKUI-20 — Caso: volver a /checkout con Atrás y la orden ya pagada. Tipo: failure. Pasos: pagar en MP y, antes del redirect, navegar a `/checkout`. Esperado (actualizado 2026-10-12): `mp-cancel` responde `paid` → aviso "¡Tu pago ya fue acreditado!" con "Ver Mis compras"; se quitan del carrito solo los productos de esa compra (si no queda nada se muestra el aviso en vez de redirigir); la orden sigue `pagado` y el stock no se restaura. Resultado: no probado.
ID: TC-CHKUI-21 — Caso: resultado `pending` (pago en proceso) y luego ir a /checkout. Tipo: edge. Pasos: llegar a `/checkout/result?status=pending`, luego abrir `/checkout`. Esperado (actualizado 2026-10-12): el resultado muestra "Pago en proceso" + "Ver Mis compras", quita del carrito solo lo comprado y olvida la compra guardada; en /checkout no se llama a `mp-cancel`. Resultado: no probado.

### Lote de robustez de checkout / admin (2026-10-12)

> Verificación hecha: `npx tsc --noEmit -p tsconfig.app.json` (sin errores) y ESLint sobre lo tocado (sin errores nuevos). Sin navegador, backend nuevo ni base: lo demás queda "no probado". Requiere backend con `POST /orders/mp-cancel`, errores de stock con `code/productId/size`, `ventas.review_reason`, `expectedUpdatedAt` en `PUT /products/:id` y `PATCH /orders/:id/confirm-late-transfer`.

ID: TC-CHKUI-22 — Caso: volver de MP con un pago todavía en curso. Tipo: failure/security. Pasos: iniciar un pago que quede `in_process` y volver con Atrás a /checkout. Esperado: `mp-cancel` → `held`; aviso "Tu pago todavía se está procesando… No vuelvas a pagar" con "Verificar de nuevo" y "Ver Mis compras"; CTA de pago deshabilitado con el motivo; la compra guardada se conserva. Resultado: no probado.
ID: TC-CHKUI-23 — Caso: `mp-cancel` no responde / red caída. Tipo: failure. Pasos: bloquear `/orders/mp-cancel` (DevTools) y volver de MP. Esperado: "Liberando tu reserva anterior…" como máximo ~15 s, luego "No pudimos verificar tu compra anterior" con "Reintentar"; el CTA no queda bloqueado para siempre. Resultado: no probado.
ID: TC-CHKUI-24 — Caso: otra cuenta en la misma pestaña. Tipo: security. Pasos: usuario A va a MP y vuelve; cerrar sesión, entrar como B y abrir /checkout. Esperado: no se llama a `mp-cancel` (`mp_owner` ≠ B) ni se borran las claves de A. Resultado: no probado.
ID: TC-CHKUI-25 — Caso: Atrás desde MP con bfcache (Safari iOS / Firefox). Tipo: edge. Pasos: "Ir a Mercado Pago" y volver con Atrás. Esperado: el CTA deja de decir "Redirigiendo a Mercado Pago..." (`pageshow` persisted), se vuelve a consultar `mp-cancel` y el próximo intento usa otra `Idempotency-Key`. Resultado: no probado (requiere navegador real).
ID: TC-CHKUI-26 — Caso: redirección a MP trabada. Tipo: failure. Pasos: simular que la navegación a `init_point` no ocurre. Esperado: a los 15 s se rehabilita el CTA con "Mercado Pago está tardando en abrir…"; reintentar reutiliza la misma `Idempotency-Key` (no reserva stock de nuevo). Resultado: no probado.
ID: TC-CHKUI-27 — Caso: transferencia en Safari iOS. Tipo: happy/cross-browser. Pasos: elegir transferencia y "Enviar comprobante por WhatsApp". Esperado: se abre una pestaña en el click que luego navega a wa.me; aparece "Pedido creado" con "Abrir WhatsApp" y "Volver a la tienda"; el CTA desaparece. Resultado: no probado.
ID: TC-CHKUI-28 — Caso: ventana bloqueada por el navegador. Tipo: edge. Pasos: bloquear popups y enviar la transferencia. Esperado: la orden se crea igual; el panel indica tocar "Abrir WhatsApp" y el link abre wa.me con el resumen. Resultado: no probado.
ID: TC-CHKUI-29 — Caso: doble click / reenvío en transferencia. Tipo: concurrencia. Pasos: doble click rápido en el CTA; luego intentar reenviar. Esperado: una sola request (guard por ref + misma key) y una sola venta; tras crearla no hay CTA. Resultado: no probado.
ID: TC-CHKUI-30 — Caso: precio cambió desde que se armó el carrito. Tipo: edge. Pasos: agregar producto, cambiar su precio en admin, abrir /checkout. Esperado: "Verificando precio y stock…" (pago bloqueado) → aviso "Actualizamos precios" con el nombre; resumen y total con el precio nuevo. Resultado: no probado.
ID: TC-CHKUI-31 — Caso: talle agotado en el carrito. Tipo: edge. Pasos: carrito con talle X; dejar X en 0 en admin; abrir /checkout. Esperado: línea resaltada "Revisá este producto" y bloque "Hay productos que no podemos venderte así" con "Cambiar talle" (`PurchaseVariantModal`) y "Quitar del carrito"; CTA bloqueado hasta resolver. Compra directa: "Ver producto". Resultado: no probado.
ID: TC-CHKUI-32 — Caso: 409 de talle del backend al pagar. Tipo: failure. Pasos: con el checkout abierto, agotar el talle desde otra sesión y pagar. Esperado: mensaje del backend sobre la línea (`CheckoutStockError` con `productId`), se relee el stock y aparecen las acciones; al cambiar el talle el error desaparece. Resultado: no probado.
ID: TC-CHKUI-33 — Caso: lectura de stock caída. Tipo: failure. Pasos: bloquear la lectura de `productos` al abrir /checkout. Esperado: tras ≤8 s "No pudimos verificar el precio y el stock actuales" con "Reintentar"; se permite pagar (el backend revalida). Resultado: no probado.
ID: TC-CHKUI-34 — Caso: sin conexión al crear la orden. Tipo: failure. Pasos: modo offline y enviar (MP o transferencia). Esperado: "No pudimos conectarnos. Revisá tu conexión y reintentá." (nunca "Failed to fetch"/"Load failed"); timeout a los 20 s con el mismo mensaje; al reintentar con conexión se usa la misma `Idempotency-Key`. Resultado: no probado.
ID: TC-CHKUI-35 — Caso: carrito en dos pestañas. Tipo: edge. Pasos: abrir el sitio en dos pestañas; agregar/quitar en una. Esperado: la otra refleja el cambio sin recargar; vaciar en una vacía la otra. Resultado: no probado.
ID: TC-CHKUI-36 — Caso: `/checkout/result` aprobado. Tipo: happy. Pasos: pagar con APRO. Esperado: "Confirmando tu pago…" → "¡Pago aprobado!"; si `mp-confirm` falla: "¡Recibimos tu pago!… lo estamos verificando" (no "registrados correctamente"); se quitan del carrito solo los productos comprados. Resultado: no probado.
ID: TC-CHKUI-37 — Caso: recargar `/checkout/result`. Tipo: edge. Pasos: tras un resultado aprobado, agregar otro producto y recargar (F5). Esperado: el carrito NO se vacía (ya no hay `mp_last_order`); no existe fallback a `clearCart()`. Resultado: ok (estático); navegador no probado.
ID: TC-CHKUI-38 — Caso: `/checkout/result` fallido. Tipo: failure. Pasos: pagar con OTHE. Esperado: "El pago no se pudo completar" + "Liberando tu reserva…" → `released`: aparece "Volver al checkout"; `held`: "Tu pago todavía se está procesando"; `paid`: "¡Tu pago ya fue acreditado!"; `error`: nota + "Reintentar". Resultado: no probado.
ID: TC-CHKUI-39 — Caso: aviso previo a MP accesible. Tipo: a11y. Pasos: abrir el aviso con teclado. Esperado: foco inicial en "Volver"; Tab/Shift+Tab quedan dentro del diálogo; Escape cierra y devuelve el foco; texto "se liberará el producto y volverá a estar disponible". Resultado: no probado.
ID: TC-SALES-15 — Caso: venta MP pendiente de 30 min. Tipo: edge. Esperado: badge "Pago en proceso"; aparece con el filtro "Pago en proceso" y no en "Pendiente" ni "Expirado"; >24 h pasa a "Expirado"; transferencia >5 h "Expirado". Resultado: no probado.
ID: TC-SALES-16 — Caso: etiquetas de revisión. Tipo: happy. Pasos: ventas con `review_reason` = amount_mismatch / duplicate_payment / refunded / charged_back y una con `oversold`. Esperado: "Revisar: monto distinto / cobro duplicado / reembolsado / contracargo" y "Sin stock: reembolsar", mismo estilo (tokens danger). Resultado: no probado.
ID: TC-SALES-17 — Caso: columna `review_reason` sin migrar. Tipo: failure. Esperado: "No pudimos cargar las ventas" explicando la migración faltante + "Reintentar" (no tabla vacía). Resultado: no probado.
ID: TC-SALES-18 — Caso: confirmar pago tardío. Tipo: happy/concurrencia. Pasos: transferencia `expirado` → "Confirmar pago tardío" → confirmar; doble click. Esperado: diálogo de confirmación (foco en "Volver", Escape cierra); un solo request; modal "Pago confirmado"; si `oversold`: "Se confirmó, pero ya no había stock: reembolsá o conseguí la mercadería."; 409 → modal de error con el mensaje del backend. Resultado: no probado.
ID: TC-SALES-19 — Caso: sin `alert()` ni `fallido`. Tipo: UX. Pasos: forzar error al confirmar/cancelar transferencia. Esperado: modal de error con el mensaje, sin `alert` nativo; `fallido` no aparece en filtros ni labels. Resultado: ok (estático); render no probado.
ID: TC-PROD-32 — Caso: editar producto sin stock por talle. Tipo: failure (regresión de datos). Pasos: abrir un producto con stock solo en la columna `stock` y guardarlo desde la vista previa. Esperado: el body del `PUT` NO incluye `stock`; el stock se conserva; el formulario muestra el stock actual en solo lectura con nota. Crear un producto sin talles envía `stock: 0`. Resultado: ok (estático: `buildPayload` deja `stock` undefined al editar y JSON lo omite); request real no probada.
ID: TC-PROD-33 — Caso: edición concurrente. Tipo: concurrencia. Pasos: dos admins abren el mismo producto; A guarda; B confirma. Esperado: B recibe 409 `PRODUCT_CHANGED`; la vista previa avisa, recarga el producto, conserva lo escrito por B salvo el stock por talle (toma el actual) y B puede confirmar de nuevo. `expectedUpdatedAt` = string crudo de `updated_at`. Resultado: no probado.
ID: TC-PROD-34 — Caso: abrir producto para editar. Tipo: happy/failure. Esperado: "Cargando producto…" y el modal abre con datos releídos sin caché; si falla, mensaje y se puede reintentar; si no existe, "Este producto ya no existe. Actualizá la lista.". Resultado: no probado.

## Casos — Seguimiento de despacho en "Mis compras" (2026-10-12)

> Alcance: `DispatchTracker.tsx/.css` + polling silencioso de 20 s en `MyPurchasesModal.tsx`. Backend: `GET /orders/user` (`Order.findPaidByEmail`, solo `payment_status = 'pagado'`, devuelve `dispatch_status`). Verificación hecha por lectura de código + `npx tsc -b --noEmit` (verde); sin navegador ni backend.

ID: TC-DSP-01 — Caso: pedido con envío (correo) en cada estado. Tipo: happy. Pasos: admin cambia el despacho de una compra pagada a pendiente / en preparación / despachado / entregado; abrir "Mis compras". Esperado: 4 pasos "Pendiente, En preparación, Despachado, Entregado"; previos `done`, actual `current` (aria-current="step"), hint acorde; entregado en verde. Resultado: ok (estático: mapeo STATUS_RANK/labels coherente); render real no probado.
ID: TC-DSP-02 — Caso: retiro en local (`shipping_method='local'`). Tipo: happy. Esperado: el 3er paso es "Listo para retiro" (FiMapPin) con hint "Tu pedido te espera en el local". Resultado: ok (estático); render no probado.
ID: TC-DSP-03 — Caso: `dispatch_status` null / vacío. Tipo: edge. Esperado: se muestra como "Pendiente" (igual que admin), sin crash. Resultado: ok (estático).
ID: TC-DSP-04 — Caso: estado desconocido ('cancelado', 'xyz'). Tipo: edge. Esperado: cae a "Pendiente" sin crash. Resultado: ok (estático) para valores comunes.
ID: TC-DSP-05 — Caso: estado = nombre de propiedad de Object ('constructor', 'toString', '__proto__'). Tipo: edge/robustez. Esperado: tratado como pendiente. Resultado: ok (estático, 2026-10-12: `isTrackerStatus` usa `Object.hasOwn(STATUS_RANK, value)`). Antes: fail (`value in STATUS_RANK` incluía el prototipo -> TypeError y el modal se rompía).
ID: TC-DSP-06 — Caso: combinación inconsistente (`despachado` con local, o `listo_para_retiro` con correo/moto histórico). Tipo: edge. Esperado: el 3er paso lo define el estado (local+despachado -> "Despachado" con FiTruck; correo+listo_para_retiro -> "Listo para retiro" con FiMapPin) y el hint coincide con ese paso. Resultado: ok (estático, 2026-10-12: `pickMiddleStep` prioriza el estado; hint = `STATUS_HINT[currentStep.status]`); render no probado.
ID: TC-DSP-07 — Caso: `shipping_method` null o 'moto' histórico. Tipo: edge. Esperado: paso de envío "Despachado" (rama no-local). Resultado: ok (estático).
ID: TC-DSP-08 — Caso: polling actualiza el estado sin cerrar el modal. Tipo: happy. Pasos: abrir Mis compras; admin cambia estado; esperar ≤20 s. Esperado: el tracker cambia sin loader ni parpadeo del listado. Resultado: ok (estático: `setPurchases(fresh)` sin `setLoading`); temporización real no probada.
ID: TC-DSP-09 — Caso: polling en vista Detalle de compra. Tipo: happy. Esperado: `selectedPurchase` se reemplaza por la versión fresca (mismo id) y el tracker del detalle se actualiza; si la compra no vuelve en la lista se conserva la anterior. Resultado: ok (estático).
ID: TC-DSP-10 — Caso: pestaña oculta. Tipo: edge. Esperado: no hay requests con `document.hidden`; al volver a la pestaña se refresca de inmediato (visibilitychange). Resultado: ok (estático); DevTools Network no probado.
ID: TC-DSP-11 — Caso: fallo de red/500 durante el polling. Tipo: failure. Esperado: se conserva lo mostrado, sin error visible, se reintenta en el próximo ciclo. Resultado: ok (estático: catch silencioso + finally libera `inFlight`). Nota: 401 por token expirado también se traga en silencio (el usuario ve datos viejos sin aviso).
ID: TC-DSP-12 — Caso: request lenta (>20 s) no solapa. Tipo: concurrencia. Esperado: máx. 1 request en vuelo por efecto (`let inFlight` local al efecto de polling). Resultado: ok (estático).
ID: TC-DSP-13 — Caso: cerrar el modal con request en vuelo / cambiar de e-mail. Tipo: concurrencia. Esperado: cleanup limpia interval y listener; respuesta tardía se descarta (`cancelled`), tanto del polling como de la carga inicial. Resultado: ok (estático, 2026-10-12: el flag en vuelo es local a cada ejecución del efecto, al reabrir no se saltea un ciclo; la carga inicial también tiene guard `cancelled`).
ID: TC-DSP-14 — Caso: carga inicial y refresh solapados (polling dispara mientras carga la lista inicial) o respuesta vieja pisando a una nueva. Tipo: concurrencia. Esperado: sin regresión de estado. Resultado: no probado; riesgo bajo (el flag en vuelo del polling no cubre el fetch inicial: entre ambos, la última respuesta gana; las respuestas de un efecto ya limpiado se descartan).
ID: TC-DSP-15 — Caso: doble apertura/cierre rápida del modal. Tipo: concurrencia. Esperado: sin intervals duplicados. Resultado: ok (estático, cleanup por efecto).
ID: TC-DSP-16 — Caso: permisos. Tipo: security. Pasos: `GET /api/orders/user?email=<ajeno>` con usuario común; sin token. Esperado: 403 / 401; solo se listan compras `pagado` (una compra pendiente/cancelada no muestra tracker). Resultado: filtro `pagado` y consulta parametrizada ok (estático, Order.js:28); 403/401 no probado en esta pasada (ver TC-100+ de órdenes).
ID: TC-DSP-17 — Caso: usuario con >1 página de compras. Tipo: edge. Esperado: el polling refresca las mismas compras visibles. Resultado: no probado; el front no manda limit/offset, por lo que depende del límite por defecto del backend (compras antiguas fuera de la primera página no se ven ni se refrescan; comportamiento previo).
ID: TC-DSP-18 — Caso: mobile 320/375 px. Tipo: responsive. Esperado: 4 columnas sin scroll horizontal, labels con wrap ("En preparación", "Listo para retiro"), nodo 36 px, conector alineado. Resultado: no probado visualmente; (2026-10-12) grid `repeat(4, minmax(0, 1fr))`, labels con `overflow-wrap: anywhere` + `hyphens: auto`, padding horizontal 0.5rem bajo 360 px.
ID: TC-DSP-19 — Caso: a11y. Tipo: a11y. Esperado: `<ol aria-label>`, `aria-current="step"`, íconos aria-hidden, `prefers-reduced-motion` desactiva la animación; cada `<li>` anuncia "completado" / "paso actual" / "pendiente" (texto visualmente oculto); pasos completados con ícono de tilde; sin `role="status"` por tracker; hint solo con el texto de ayuda. Resultado: ok (estático, 2026-10-12). Contraste: `--tracker-muted-text` #6e6578 sobre blanco ~5.5:1 (AA, calculado); nodos done/current con fondo `color-mix(primary-accent 80%, black)`: con acento dorado #C9A227 el ícono blanco queda ~3.7:1 (>= 3:1 para no-texto, calculado). No medido con herramienta ni lector de pantalla real.
ID: TC-DSP-20 — Caso: build/lint. Tipo: regresión. Resultado (2026-10-12): `npx tsc -b --noEmit` ok. ESLint de DispatchTracker.tsx y MyPurchasesModal.tsx: 1 error preexistente `react-hooks/set-state-in-effect` en el efecto de carga inicial de `MyPurchasesModal.tsx` (`setLoading(true)`); no se resolvió porque requiere reestructurar la carga (estado derivado o key por apertura). El lint no queda en verde.
ID: TC-DSP-21 — Caso: carga inicial falla y luego el polling trae datos. Tipo: failure. Pasos: abrir Mis compras con el backend caído (ver mensaje de error); levantar el backend; esperar <= 20 s o cambiar de pestaña y volver. Esperado: el error desaparece y se muestra el listado. Resultado: ok (estático: `setError(null)` en el `.then` del polling); no probado en navegador.
ID: TC-DSP-22 — Caso: dos compras del mismo producto (distinta cantidad/variante/estado de despacho). Tipo: edge. Pasos: abrir Mis compras; tocar la segunda compra. Esperado: el detalle muestra cantidad, total, variantes y seguimiento de la compra tocada, no de la primera. Resultado: ok (estático: `onOpenProduct` recibe el `Purchase` completo, sin `find` por `product_id`); no probado en navegador.
ID: TC-DSP-23 — Caso: respuesta tardía del detalle. Tipo: concurrencia. Pasos: con red lenta (DevTools Slow 3G) abrir una compra, tocar "Volver" y abrir otra compra antes de que termine la primera request. Esperado: el detalle muestra el producto de la segunda compra; la primera respuesta se descarta y el loader no se apaga antes de tiempo. Resultado: ok (estático: contador `detailRequestId`, invalidado también en Volver/Cerrar); no probado en navegador.
ID: TC-DSP-24 — Caso: temas estacionales con acento claro (dorado, naranja, rosa). Tipo: a11y/visual. Pasos: activar cada tema de `utils/seasons.css`; abrir Mis compras con una compra "en preparación". Esperado: ícono blanco legible sobre nodos completados/actual (fondo oscurecido), halo del color del tema, pulso de 3 ciclos y luego quieto. Resultado: no probado visualmente.

## Casos — Carrusel del Home en red lenta y con concurrencia (2026-10-12)

ID: TC-CAR-01 — Caso: primera visita en Slow 3G con caché desactivada. Tipo: happy/failure. Pasos: DevTools > Network > Slow 3G + "Disable cache"; abrir `/`. Esperado: tras el skeleton breve aparece el carrusel con el loader "Preparando la mejor moda para vos" sobre fondo claro y la imagen entra con fade al cargar; nunca queda gris indefinido ni se ve negro ni borroso. Resultado: no probado (sin `.env` de Supabase en el entorno; verificado solo tsc/eslint/build).
ID: TC-CAR-02 — Caso: cambio de slide en 3G. Tipo: failure. Pasos: misma red; esperar el pase automático y tocar las flechas rápido. Esperado: el automático no avanza hasta tener el siguiente slide precargado; al tocar una flecha sin precarga se ve el loader sobre fondo claro, no negro. Resultado: no probado.
ID: TC-CAR-03 — Caso: Supabase lento/caído. Tipo: failure. Pasos: bloquear `**supabase.co/**` o demorarlo >12 s. Esperado: un reintento y luego el estado vacío con logo (nunca skeleton infinito). Resultado: no probado.
ID: TC-CAR-04 — Caso: layout con error pero imágenes ok. Tipo: edge. Esperado: se ve el carrusel en collage. Resultado: no probado.
ID: TC-CAR-05 — Caso: escritorio y móvil (320, 375, 768, 1440). Tipo: responsive. Esperado: cada ancho pide URLs con w/h de los escalones (ver pestaña Network: `w_320…w_1920`); mismas URLs entre visitas con el mismo ancho. Resultado: no probado.
ID: TC-CAR-06 — Caso: móvil scrolleando (barra del navegador cambia el alto). Tipo: edge. Esperado: no se vuelven a pedir las imágenes del carrusel. Resultado: no probado.
ID: TC-CAR-07 — Caso: volver al Home desde un producto (<2 min). Tipo: edge. Esperado: sin nuevo request a `carousel_images`/`carousel_settings`, imagen sin fade. Resultado: no probado.
ID: TC-CAR-08 — Caso: un solo slide / cero imágenes. Tipo: edge. Esperado: sin flechas ni autoplay / logo vacío. Resultado: no probado.
ID: TC-CAR-09 — Caso: carga concurrente (muchas pestañas a la vez). Tipo: concurrencia. Esperado: cada visitante hace 2 requests a Supabase y, si fallan, un solo reintento con retardo aleatorio (sin tormenta sincronizada). Resultado: no probado.
ID: TC-CAR-10 — Caso: `prefers-reduced-motion`. Tipo: a11y. Esperado: la imagen aparece sin fade. Resultado: no probado.

## Casos — Banners editables del carrusel (2026-10-15)

Verificado en esta pasada con un arnés temporal (Vite + Chromium headless, Supabase simulado; el arnés se borró): editor Desktop 1440×800 y Mobile 390×844, render público a pantalla completa, arrastre, deshacer, color, guardado (payload) y validaciones. NO se probó contra la base real (migración sin aplicar), ni el carrusel público con autoplay/transiciones, ni Safari iOS / Android.

ID: TC-BAN-01 — Caso: crear un banner (Desktop). Tipo: happy. Pasos: Admin > Home > Carrusel > "Crear banner editable"; editar textos; "Guardar banner". Esperado: se abre el editor con la plantilla (subtítulo, título, detalle, botón); al guardar vuelve a la lista con una miniatura del banner como slide propio y en `/` se ve en el carrusel. Resultado: parcial — editor y guardado (payload con 4 elementos, color nuevo) ok en el arnés; persistencia real y vista en `/` no probadas.
ID: TC-BAN-02 — Caso: arrastrar un elemento. Tipo: happy. Esperado: sigue al puntero, se pega al centro (guía) cerca de 50%, el panel muestra sus propiedades. Resultado: ok (arnés: desplazamiento 120 px / 54 px, y=50 con snap).
ID: TC-BAN-03 — Caso: deshacer/rehacer. Tipo: happy. Pasos: arrastrar, Ctrl+Z, Ctrl+Y. Esperado: vuelve a la posición original y la rehace; un arrastre completo es un solo paso. Resultado: ok (arnés, deshacer a 0/0).
ID: TC-BAN-04 — Caso: cambiar color de un elemento y del fondo. Tipo: happy. Esperado: se refleja al instante. Resultado: ok (arnés, swatch "Fucsia" guardado como #b8377d).
ID: TC-BAN-05 — Caso: foto opcional. Tipo: edge. Pasos: banner sin fotos (plantilla) / agregar "Foto" y no elegir imagen / elegir foto de Cloudinary / quitar foto de fondo. Esperado: sin fotos se guarda bien; una foto vacía bloquea el guardado con mensaje y la selecciona; en público una foto vacía no deja hueco. Resultado: ok el bloqueo y la apertura del selector (arnés); elegir una foto real de Cloudinary no probado (sin backend).
ID: TC-BAN-06 — Caso: teclado. Tipo: a11y. Pasos: Tab hasta un elemento, flechas (Shift = salto grande), Supr, Esc. Esperado: mueve, elimina, deselecciona; Esc del editor pide confirmación si hay cambios. Resultado: ok flechas y confirmación (arnés); Supr no probado.
ID: TC-BAN-07 — Caso: salir con cambios sin guardar. Tipo: failure. Esperado: confirmación "¿Salir sin guardar?"; "Seguir editando" conserva todo. Resultado: ok el aviso (arnés); "Seguir editando" no probado.
ID: TC-BAN-08 — Caso: link del botón inválido (`javascript:alert(1)`, `//evil.com`, `http://`). Tipo: security. Esperado: error inline y guardado bloqueado; al leer de la base se descarta (saneado). Resultado: ok el saneado (prueba ad-hoc de `parseBannerDesign`: href `javascript:` vacío, foto `http://` descartada, colores no hex a valor por defecto, texto a 300 caracteres); bloqueo inline no probado en UI.
ID: TC-BAN-09 — Caso: doble click en "Guardar banner" / red caída al guardar. Tipo: concurrencia/failure. Esperado: el botón se deshabilita mientras guarda; si falla muestra "No pudimos guardar el banner…" y conserva el diseño. Si falta la migración, el mensaje nombra el archivo SQL. Resultado: no probado (lógica revisada).
ID: TC-BAN-10 — Caso: numeración con banner entre fotos (collage 3: 2 fotos + banner + 4 fotos). Tipo: edge. Esperado: slides de 2, 1 (banner), 3, 1; el admin muestra la misma numeración. Resultado: ok el agrupado (prueba ad-hoc de `groupBySlide`); vista en el admin no probada.
ID: TC-BAN-11 — Caso: banner en Mobile y Desktop por separado. Tipo: edge. Esperado: cada dispositivo tiene su diseño; en 390 px el texto se lee y el botón no se corta. Resultado: ok el editor Mobile (captura); en dispositivo real no probado.
ID: TC-BAN-12 — Caso: pantalla de proporción distinta a 16:9 (ultrawide, 4:3, móvil apaisado). Tipo: edge. Esperado: los elementos conservan su posición relativa; los textos escalan por ancho. Resultado: no probado; riesgo conocido: en pantallas muy bajas o anchas los elementos pueden acercarse entre sí.
ID: TC-BAN-13 — Caso: autoplay/flechas/puntos con un banner en el medio y precarga de sus fotos. Tipo: happy. Resultado: no probado.
ID: TC-BAN-14 — Caso: eliminar un banner. Tipo: failure. Esperado: pide confirmación; "Cancelar" no borra. Resultado: no probado.
ID: TC-BAN-15 — Caso: sin migración aplicada. Tipo: failure. Esperado: el carrusel público y la lista siguen mostrando fotos; guardar un banner muestra el mensaje de migración. Resultado: no probado.
ID: TC-BAN-16 — Caso: build/lint/tipos. Tipo: regresión. Resultado (2026-10-15): `tsc -b` y `vite build` ok (editor en chunk propio de ~18 kB); ESLint de los archivos nuevos/tocados sin errores; persisten 2 errores preexistentes en `MyPurchasesModal.tsx` y `NavBar.tsx`.

## Casos — Color del menú por slide (2026-10-16)

Verificado con un arnés temporal (Vite + Chromium headless; Supabase y las imágenes simulados con `page.route`; el arnés se borró): Home con `NavBar` + `Carousel` reales y dos slides (foto oscura con menú blanco, banner claro con menú gris oscuro), el diálogo de color y el editor de banner. NO probado: base real (migración sin aplicar), fotos reales de Cloudinary (CORS del muestreo), Safari iOS / Android.

ID: TC-NAV-01 — Caso: el menú cambia de color con el slide. Tipo: happy. Pasos: dos slides con colores distintos; esperar el pase o tocar la flecha. Esperado: los links/íconos del menú toman el color del slide visible, con transición suave. Resultado: ok (arnés: blanco en slide 1, rgb(51,51,51) en slide 2).
ID: TC-NAV-02 — Caso: slide sin color propio. Tipo: edge. Esperado: usa el color de Config. del sitio (comportamiento anterior). Resultado: no probado.
ID: TC-NAV-03 — Caso: scroll con el menú ya sólido. Tipo: edge. Esperado: el menú sólido sigue con su color por defecto (no queda texto blanco sobre fondo blanco). Resultado: no probado (la regla `isAtTop && color` no se modificó).
ID: TC-NAV-04 — Caso: diálogo "Menú" de una foto. Tipo: happy. Esperado: vista previa con el menú sobre la foto, "Elegir el más legible" elige blanco/oscuro según la franja superior y muestra la razón de contraste; "Guardar color" persiste. Resultado: ok con imagen simulada (16,9:1, guardado #ffffff); con foto real de Cloudinary no probado.
ID: TC-NAV-05 — Caso: imagen que no se puede analizar (CORS/red). Tipo: failure. Esperado: aviso "No pudimos analizar la imagen", el auto-elegir queda deshabilitado, se puede elegir a mano. Resultado: no probado.
ID: TC-NAV-06 — Caso: color en el editor de banner. Tipo: happy. Esperado: la maqueta del menú se ve sobre el lienzo, "Elegir el más legible" usa el fondo del banner, y "Guardar banner" envía el color. Resultado: ok (arnés: #333333 sobre fondo hueso, 11,0:1).
ID: TC-NAV-07 — Caso: contraste malo. Tipo: edge. Pasos: elegir blanco sobre un banner blanco. Esperado: aviso en rojo "Casi no se lee". Resultado: no probado (lógica de niveles 4,5 / 3).
ID: TC-NAV-08 — Caso: collage. Tipo: edge. Esperado: el botón "Menú" aparece solo en la primera foto de cada slide, con aviso de que vale la primera. Resultado: no probado.
ID: TC-NAV-09 — Caso: "Usar el del sitio". Tipo: happy. Esperado: borra el color propio (NULL). Resultado: no probado.
ID: TC-NAV-10 — Caso: sin migración 2026-10-16. Tipo: failure. Esperado: el carrusel público sigue igual; guardar un color muestra el mensaje que nombra las migraciones. Resultado: no probado.
ID: TC-NAV-11 — Caso: seguridad. Tipo: security. Esperado: un `navbar_color` que no sea `#rrggbb` se descarta al leer (y la base lo rechaza por CHECK). Resultado: ok el saneado en front (`parseNavbarColor`, solo hex de 6 dígitos); CHECK en base no probado.
ID: TC-NAV-12 — Caso: build/tipos. Tipo: regresión. Resultado (2026-10-16): `tsc -b` y `vite build` ok; ESLint sin errores nuevos.


## Casos — Catálogo de talles (2026-10-26)

> Requiere el backend con `/api/sizes` y `optionMeta`. Resultado "no probado" = implementado, falta la corrida manual con backend.

ID: TC-SIZE-01 — Caso: ver la sección Talles. Tipo: happy. Pasos: entrar a /admin/sizes como admin. Esperado: ítem "Talles" en el sidebar; tabla (desktop) o tarjetas (375px) con talle, tipo, medidas y estado; solo talles globales. Resultado: ok en desktop (2026-10-26, base real, backend local); tarjetas a 375px: no probado.
ID: TC-SIZE-02 — Caso: estados de la lista. Tipo: edge/failure. Pasos: abrir con catálogo vacío; con la red caída; con filtros sin resultados. Esperado: vacío con CTA "Crear el primer talle"; error con "Reintentar"; mensaje "No hay talles que coincidan" sin CTA. Resultado: ok (2026-10-26): vacío con CTA, error de red con "Reintentar" (recupera la lista al reintentar) y "No hay talles que coincidan con los filtros".
ID: TC-SIZE-03 — Caso: crear talle. Tipo: happy. Pasos: "Nuevo talle", nombre `xl`, tipo Indumentaria, prenda vacía, medida Pecho = 96 cm, Guardar. Esperado: aparece como `XL`, activo, con sus medidas; aviso "Talle XL guardado." Resultado: ok (2026-10-26): "m" se guardó como M con Pecho: 96 cm y aviso "Talle M guardado.".
ID: TC-SIZE-04 — Caso: duplicado. Tipo: failure. Pasos: crear `xl` otra vez en Indumentaria; crear `38` en Calzado y en Indumentaria. Esperado: el primero muestra "Ya existe un talle con ese nombre en esa categoría."; el mismo nombre en otra categoría se permite. Resultado: ok (2026-10-26): duplicado muestra "Ya existe un talle con ese nombre para esa prenda y tipo."; "38" se crea en Calzado y en Indumentaria.
ID: TC-SIZE-05 — Caso: validaciones del formulario. Tipo: edge. Pasos: nombre vacío/solo espacios; 21+ caracteres; 9 medidas; medida repetida (`Pecho`/`pecho`); valor de 21+ caracteres; emojis. Esperado: nombre vacío da error inline; los campos no pasan de 20/30/20 caracteres; "Agregar medida" se deshabilita en 8; la repetida muestra "La medida … está repetida." Resultado: parcial (2026-10-26): nombre vacío o con espacios da "Escribí el nombre del talle."; nombre limitado a 20; tope de 8 medidas; "pecho" repetida da error; valor de 21+ caracteres y guardar un emoji: no probado.
ID: TC-SIZE-06 — Caso: editar talle. Tipo: happy. Pasos: editar nombre, tipo y medidas de un talle. Esperado: la tabla se actualiza; los productos que ya lo tienen conservan su nombre de opción. Resultado: no probado.
ID: TC-SIZE-07 — Caso: desactivar y activar. Tipo: happy/security. Pasos: Desactivar y confirmar o cancelar; luego Activar. Esperado: pide confirmación antes de desactivar (cancelar no cambia nada); activar es directo; el botón se bloquea mientras guarda. Resultado: ok (2026-10-26): confirma antes de desactivar, cancelar no cambia nada, activar es directo y la tabla se actualiza al instante tras corregir la caché HTTP.
ID: TC-SIZE-08 — Caso: acceso sin permisos. Tipo: security. Pasos: abrir /admin/sizes sin sesión admin; llamar PUT/POST /api/sizes sin token. Esperado: redirige/403, nunca se listan acciones. Resultado: no probado.
ID: TC-SIZE-09 — DEPRECATED (revertido 2026-10-26: bloque de talles del producto eliminado). Caso: producto nuevo no trae talles. Tipo: happy. Pasos: crear producto, pestaña Variantes. Esperado: bloque "Talles de este producto" vacío con texto guía; ningún global preseleccionado. Resultado: ok (2026-10-26): producto nuevo sin talles preseleccionados y con el texto guía.
ID: TC-SIZE-10 — DEPRECATED (revertido 2026-10-26: selector de talles globales eliminado). Caso: elegir talles globales. Tipo: happy. Pasos: marcar S, M y 38 en "Talles globales". Esperado: aparecen en "Talles de este producto" con etiqueta Global y stock 0 editable; el stock total se recalcula. Resultado: parcial: un global marcado aparece con etiqueta Global y stock editable; el total se recalculó en 6 al guardar (2026-10-26).
ID: TC-SIZE-11 — DEPRECATED (revertido 2026-10-26: selector de talles globales eliminado). Caso: globales inactivos. Tipo: edge. Pasos: desactivar un talle en el catálogo; abrir un producto que lo tenía y uno que no. Esperado: en el que lo tenía sigue marcado con "desactivado" y se puede quitar; en el otro no se ofrece. Resultado: parcial: el producto que ya lo tenía lo conserva marcado "desactivado" (2026-10-26); que otro producto no lo ofrezca: no probado.
ID: TC-SIZE-12 — DEPRECATED (revertido 2026-10-26: talle propio con origen/medidas eliminado). Caso: talle propio. Tipo: happy. Pasos: escribir `xxxl` y Enter; repetir con botón y medidas. Esperado: se agrega `XXXL` con etiqueta Propio; no aparece en /admin/sizes ni en otros productos; el input se limpia y recupera foco. Resultado: parcial: XL con Enter y XXL con botón y medidas se agregaron como Propio y no aparecen en /admin/sizes ni en GET /api/sizes (2026-10-26); no se verificó en un segundo producto.
ID: TC-SIZE-13 — DEPRECATED (revertido 2026-10-26: dedupe global/propio eliminado). Caso: duplicados dentro del producto. Tipo: edge. Pasos: con `M` global elegido, agregar propio `m`; con propio `XL`, marcar global XL; agregar dos veces el mismo propio. Esperado: mensajes inline claros y no se agrega nada; el propio no se convierte en global. Resultado: parcial: con M global elegido, el propio "m" se rechaza con "Este producto ya tiene el talle M." (2026-10-26); el caso inverso (propio y luego global): no probado.
ID: TC-SIZE-14 — DEPRECATED (revertido 2026-10-26: quitar global/propio eliminado; ver TC-SIZE-37). Caso: quitar talle. Tipo: happy. Pasos: quitar un global y volver a marcarlo; quitar un propio. Esperado: solo sale del producto (catálogo y otros productos intactos); el global vuelve como Global; stock y colores por talle se actualizan. Resultado: no probado.
ID: TC-SIZE-15 — DEPRECATED (revertido 2026-10-26: optionMeta ya no se guarda; ver TC-SIZE-41). Caso: guardar y reabrir. Tipo: regression. Pasos: guardar un producto con globales y propios (con medidas); reabrir; ver vista previa. Esperado: origen, stock y medidas se conservan; el body de PUT /products lleva `variants[].optionMeta`. Resultado: ok (2026-10-26): PUT/POST guarda optionMeta (global solo con sizeId, propio con medidas); al reabrir se conservan origen, stock y medidas.
ID: TC-SIZE-16 — DEPRECATED (revertido 2026-10-26: sin optionMeta; el talle vuelve a ser texto libre). Caso: producto anterior sin optionMeta. Tipo: regression. Pasos: abrir un producto con talles existentes y guardarlo. Esperado: todos figuran como Propio, sin migrarse; el checkout y el carrito siguen leyendo `options` y `stockByOption`. Resultado: parcial (2026-10-26): al abrir un producto existente (Modare Moño) todos sus talles figuran como Propio con su stock; guardarlo y comprarlo: no probado.
ID: TC-SIZE-17 — DEPRECATED (revertido 2026-10-26: el editor manual de guía volvió; ver TC-SIZE-40/41). Caso: guía anterior (`size_guide`). Tipo: regression. Pasos: editar y guardar un producto que tenía guía legacy. Esperado: no hay editor de guía; aviso de que se conserva; el guardado no la borra (no envía `sizeGuide: null`). Resultado: no probado: en la base real las guías anteriores son filas vacías, no hay una con datos para comprobar el aviso.
ID: TC-SIZE-18 — DEPRECATED (revertido 2026-10-26: el formulario ya no usa el catálogo). Caso: catálogo no disponible en el formulario. Tipo: failure. Pasos: cortar la red/500 en GET /api/sizes con la pestaña Variantes abierta. Esperado: bloque "Talles globales" con error y "Reintentar"; se pueden seguir agregando talles propios. Resultado: ok (2026-10-26): con GET /api/sizes caído el bloque muestra "No pudimos conectarnos…" con "Reintentar" y se pueden agregar talles propios.
ID: TC-SIZE-19 — DEPRECATED (revertido 2026-10-26: la guía pública ya no sale del catálogo; ver TC-SIZE-42). Caso: guía pública con globales. Tipo: happy. Pasos: abrir un producto con talles globales con medidas y tocar "Ver guía de talles". Esperado: una fila por talle (orden del producto), columnas = unión de medidas, "—" donde falta. Resultado: ok (2026-10-26): vista previa admin y público a 375px muestran M 96 cm desde el catálogo.
ID: TC-SIZE-20 — DEPRECATED (revertido 2026-10-26: la guía pública ya no sale del catálogo; ver TC-SIZE-42). Caso: guía pública con propios y mezcla. Tipo: edge. Pasos: producto con globales + propios (algunos sin medidas). Esperado: las medidas propias salen del producto; los talles sin medidas muestran "—". Resultado: ok (2026-10-26): XL propio sin medidas muestra "—" y XXL propio muestra 110 cm.
ID: TC-SIZE-21 — DEPRECATED (revertido 2026-10-26: size_guide vuelve a ser la guía principal; ver TC-SIZE-42/43). Caso: guía legacy como fallback. Tipo: regression. Pasos: producto sin medidas en sus talles pero con `size_guide`. Esperado: se muestra la guía anterior como hoy. Resultado: parcial (2026-10-26): cubierto por test unitario; en la base real no hay guía anterior con datos para verla.
ID: TC-SIZE-22 — DEPRECATED (revertido 2026-10-26: ver TC-SIZE-43). Caso: sin datos para la guía. Tipo: edge. Pasos: producto con talles sin medidas ni guía legacy; producto sin variante Talle. Esperado: el botón "Ver guía de talles" no aparece. Resultado: ok (2026-10-26): productos con talles sin medidas ni guía con datos (ids 39 y 12) no muestran el botón; tras corregir las filas vacías de la guía anterior.
ID: TC-SIZE-23 — DEPRECATED (revertido 2026-10-26: la guía pública ya no consulta el catálogo). Caso: guía con catálogo lento/caído. Tipo: failure. Pasos: producto con globales y GET /api/sizes lento o con 500. Esperado: el botón aparece al terminar de cargar; el modal muestra loader o el error con "Reintentar". Resultado: no probado.
ID: TC-SIZE-24 — Caso: mobile 320/375px. Tipo: a11y/mobile. Pasos: recorrer /admin/sizes, el formulario, el bloque de talles del producto y la guía pública. Esperado: sin scroll horizontal de página, botones de al menos 44px, foco visible, todo operable con teclado y labels leídos por lector de pantalla. Resultado: parcial (2026-10-26): /admin/sizes (lista, formulario, validaciones), guía pública y lista de talles del producto a 375px sin scroll horizontal; 320px y navegación por teclado/lector de pantalla: no probado.
 Nota: el bloque de talles del producto ahora es el flujo anterior (ver TC-SIZE-35..42).
ID: TC-SIZE-25 — Caso: helpers puros (dedupe, sanitize con optionMeta, tabla de medidas). Tipo: regression. Pasos: `e2e/size-helpers.spec.ts`. Esperado: casos ok (ver TC-SIZE-34). Resultado: ok (2026-10-26, ejecutado con un arnés esbuild+node porque `npx playwright test` no registra tests en este entorno).
 Nota: tras la reversión el spec solo cubre medidas y prenda (sin optionMeta ni dedupe de producto).
ID: TC-SIZE-26 — Caso: formulario "Nuevo talle" con prenda. Tipo: happy. Pasos: "Nuevo talle". Esperado: orden Tipo, Prenda (opcional, placeholder "Ej: Camisa, Saco, Pantalón", ayuda "Dejalo vacío si las medidas valen para cualquier prenda"), Nombre del talle (ayuda "El talle en sí: XS, M, XL, 38…"), Medidas; labels siempre visibles; foco inicial en Tipo. Resultado: ok en desktop (2026-10-26): orden Tipo, Prenda, Nombre, Medidas con sus ayudas; foco inicial: no verificado.
ID: TC-SIZE-27 — Caso: crear talle con prenda. Tipo: happy. Pasos: Tipo Indumentaria, Prenda `Camisa`, Nombre `m`, Guardar. Esperado: aparece `M` con Prenda "Camisa"; el campo Prenda sugiere (datalist) las prendas ya existentes. Resultado: parcial: se creó M con prenda QA-Camisa (2026-10-26); las sugerencias del datalist: no probado.
ID: TC-SIZE-28 — Caso: mismo nombre, distinta prenda. Tipo: edge. Pasos: crear `M` Camisa y `M` Saco; crear `M` sin prenda. Esperado: los tres se permiten; repetir `m` + `camisa` (otras mayúsculas) muestra "Ya existe ese talle para esa prenda."; repetir `M` sin prenda muestra el mensaje de duplicado sin prenda. Resultado: ok (2026-10-26): "M" Camisa y "M" Saco conviven, "m" + "qa-camisa" y "M" sin prenda repetida dan duplicado.
ID: TC-SIZE-29 — Caso: prenda vacía o con espacios / borrar prenda. Tipo: edge. Pasos: crear con prenda `   `; editar un talle con prenda y vaciarla; prenda de 31+ caracteres y emojis. Esperado: queda sin prenda ("—"); al vaciar en edición se borra (PUT con `garment: null`); el campo no pasa de 30 caracteres. Resultado: parcial (2026-10-26): vaciar la prenda al editar la borra (PUT con garment null); prenda de 31+ caracteres, solo espacios y emojis: no probado.
ID: TC-SIZE-30 — Caso: lista con prenda y filtro. Tipo: happy. Pasos: en /admin/sizes usar "Filtrar por prenda" (Todas / Sin prenda / una prenda) combinado con tipo y estado; ver tabla y tarjetas a 375px. Esperado: columna/etiqueta Prenda ("—" si no tiene); el filtro lista solo prendas existentes; sin resultados muestra el vacío con filtros. Resultado: parcial (2026-10-26): tarjetas a 375px con "Prenda: —", filtros por tipo y por estado, y "Sin prenda" en el filtro de prenda; filtrar por una prenda concreta: no probado.
ID: TC-SIZE-31 — DEPRECATED (revertido 2026-10-26: selector agrupado por prenda en el producto eliminado). Caso: selector agrupado por prenda en el producto. Tipo: happy. Pasos: producto > Variantes > Talle con globales con y sin prenda. Esperado: grupos por prenda (sin prenda como "General"), chips "M · Camisa"; marcar uno lo agrega como `M` con etiqueta "Global · Camisa". Resultado: ok (2026-10-26): grupos por prenda y chips "M · QA-Camisa"; el grupo "General" (sin prenda): no probado.
ID: TC-SIZE-32 — DEPRECATED (revertido 2026-10-26: selector de globales eliminado). Caso: dos globales con el mismo nombre en un producto. Tipo: edge. Pasos: marcar "M · Camisa" y luego "M · Saco". Esperado: no se agrega el segundo y aparece inline "Este producto ya tiene el talle M."; desmarcar el primero permite elegir el otro. Resultado: parcial: el segundo M se bloquea con "Este producto ya tiene el talle M." (2026-10-26); desmarcar el primero y elegir el otro: no probado.
ID: TC-SIZE-33 — DEPRECATED (revertido 2026-10-26: la guía pública ya no sale del catálogo; ver TC-SIZE-42). Caso: guía pública no cambia. Tipo: regression. Pasos: producto con global `M` de una prenda y otros talles; "Ver guía de talles". Esperado: misma tabla (una fila por talle, sin columna de prenda). Resultado: ok (2026-10-26): misma tabla (una fila por talle, sin columna de prenda).
ID: TC-SIZE-34 — Caso: helpers de prenda. Tipo: regression. Pasos: `e2e/size-helpers.spec.ts`. Esperado: 25 casos ok (7 nuevos de prenda/agrupación/dedupe). Resultado: ok (ejecutado con arnés esbuild+node, no con Playwright).
 Nota: los helpers de dedupe de producto ya no existen; vale para medidas y prenda.
ID: TC-SIZE-35 — Caso: agregar talle libre con stock. Tipo: happy. Pasos: ProductModal > Variantes > Talle; escribir `xl` y Enter; escribir `xxl` y tocar el botón de agregar. Esperado: aparece cada talle como tag con X y stock editable; el input se limpia y no hay catálogo ni etiquetas Global/Propio. Resultado: no probado.
ID: TC-SIZE-36 — Caso: talle duplicado y MAYÚSCULAS. Tipo: edge. Pasos: agregar `m` y luego `M` y `m ` (con espacio); agregar vacío; texto muy largo y emojis. Esperado: se normaliza a MAYÚSCULAS, no se duplica y no se agrega vacío. Resultado: no probado.
ID: TC-SIZE-37 — Caso: quitar talle. Tipo: happy. Pasos: tocar la X de un talle con stock y color. Esperado: sale del producto junto con su stock y colores; el stock total se recalcula. Resultado: no probado.
ID: TC-SIZE-38 — Caso: stock total = suma por talle. Tipo: happy. Pasos: cargar stock 3, 0 y 5 en tres talles; editar uno. Esperado: el stock total del producto es la suma y se actualiza al instante; sin negativos ni decimales. Resultado: no probado.
ID: TC-SIZE-39 — Caso: colores por talle. Tipo: happy. Pasos: asignar colores a un talle y quitarlos; guardar y reabrir. Esperado: los colores quedan por talle y se conservan. Resultado: no probado.
ID: TC-SIZE-40 — Caso: editor manual de guía de talles. Tipo: happy. Pasos: elegir tipo indumentaria o calzado; agregar y quitar columnas; agregar y quitar filas; completar celdas. Esperado: el editor responde a cada cambio y la vista previa de la tabla es coherente. Resultado: no probado.
ID: TC-SIZE-41 — Caso: guardar y reabrir conservando la guía. Tipo: regression. Pasos: guardar un producto con talles, stock, colores y guía; reabrirlo y ver la vista previa. Esperado: todo se conserva; el PUT /products lleva `size_guide` y `variants` sin `optionMeta`. Resultado: no probado.
ID: TC-SIZE-42 — Caso: guía pública con size_guide. Tipo: happy. Pasos: abrir un producto con guía cargada y tocar "Ver guía de talles". Esperado: se muestra la tabla de `product.sizeGuide`; en 375px sin scroll horizontal de página. Resultado: no probado.
ID: TC-SIZE-43 — Caso: guía pública sin size_guide (fallback). Tipo: edge. Pasos: producto con variante Talle y sin guía; producto sin variante Talle. Esperado: el primero muestra las opciones de la variante Talle; verificar qué muestra el segundo (el botón aparece en todo producto con variantes). Resultado: no probado.
ID: TC-SIZE-44 — Caso: /admin/sizes no afecta al producto. Tipo: regression. Pasos: crear, editar y desactivar un talle en /admin/sizes; abrir el formulario de producto y el detalle público. Esperado: la variante Talle del producto no ofrece ni cambia talles (el catálogo solo alimenta el editor de guía, ver TC-SIZE-45 a 55) y la guía pública no se altera. Resultado: no probado.
ID: TC-SIZE-45 — Caso: elegir un talle global en la guía. Tipo: happy. Pasos: producto nuevo > Variantes > Guía de talles; en "Talles globales" tocar `M · Camisa` (con medidas Pecho y Largo en el catálogo). Esperado: aparece la columna `M` con etiqueta "Global", el chip queda marcado y la tabla crea las filas Pecho y Largo con los valores del catálogo. Resultado: ok (2026-10-26, catálogo simulado con page.route, sin tocar la base): columna `M` Global, 2 filas, Pecho 91 cm.
ID: TC-SIZE-46 — Caso: quitar un global solo de la guía. Tipo: happy. Pasos: con `M` global elegido, volver a tocar el chip del bloque Talles globales (o la X de la columna). Esperado: sale de la guía con sus valores; sigue disponible en el selector; el catálogo y otros productos no cambian; volver a elegirlo lo deja global. Resultado: parcial (2026-10-26): quitar por segundo toque ok; la X de la columna y volver a elegirlo: no probado en navegador (cubierto por test unitario).
ID: TC-SIZE-47 — Caso: talle propio desde el formulario. Tipo: happy. Pasos: en "+ Agregar" escribir `xxxl` y Enter; repetir con el botón. Esperado: columna `XXXL` con etiqueta "Propio"; no aparece en /admin/sizes ni en el selector de otros productos; la guía guardada no lleva `columnSources` si no hay globales. Resultado: parcial (2026-10-26): columna `XXXL` Propio con Enter ok; botón, /admin/sizes y otros productos: no probado.
ID: TC-SIZE-48 — Caso: duplicados global vs propio. Tipo: edge. Pasos: con global `M` agregar propio `m`; con propio `L` tocar el global `L`; repetir el mismo global. Esperado: mensajes inline (aria-live) "El talle global M ya está en la guía. Quitalo si querés usar uno propio." / "Ya cargaste un talle propio L en esta guía. Quitalo si querés usar el global." / "Este talle ya está en la guía."; no se agrega nada. Resultado: parcial (2026-10-26): los dos primeros mensajes ok; el global repetido solo por test unitario.
ID: TC-SIZE-49 — Caso: precarga no pisa lo tipeado. Tipo: edge. Pasos: crear la fila `pecho` con un valor en la columna `M` (o tipear antes) y elegir el global `M` con medida Pecho. Esperado: la fila existente (sin distinguir mayúsculas) conserva el valor tipeado; las celdas vacías se completan; los cambios posteriores del catálogo no afectan la guía. Resultado: no probado en navegador (test unitario ok).
ID: TC-SIZE-50 — Caso: globales desactivados y de otro tipo. Tipo: edge. Pasos: catálogo con talle desactivado y talle de calzado; abrir guía de indumentaria; cambiar a Calzado. Esperado: el desactivado no se ofrece (si ya estaba en la guía se muestra "(desactivado)" y se puede quitar); en cada tipo solo se ofrecen globales de ese tipo. Resultado: ok (2026-10-27, base real con el GET /api/sizes simulado como inactivo): la guía que ya tenía el global lo conserva con "(desactivado)", el chip sigue marcado y se puede quitar; al quitarlo deja de ofrecerse. Filtro por tipo ok (2026-10-26).
ID: TC-SIZE-51 — Caso: columnas base. Tipo: happy. Pasos: producto nuevo con catálogo con activos del tipo; luego con catálogo vacío; cambiar de tipo en ambos. Esperado: con globales activos la guía arranca sin columnas; sin globales arranca con XS–XXL (o 35–42) como propias; el cambio de tipo aplica la misma regla. Resultado: ok (2026-10-26): sin columnas con catálogo con activos; XS–XXL propias con catálogo vacío; calzado sin columnas con global activo.
ID: TC-SIZE-52 — Caso: catálogo caído o lento. Tipo: failure. Pasos: GET /api/sizes con 500 al abrir la guía; tocar "Reintentar". Esperado: mensaje con "Reintentar" y el formulario sigue usable (talles propios); al reintentar aparecen los globales sin perder lo cargado. Resultado: ok (2026-10-26, respuesta 500 simulada): mensaje con Reintentar, propio `ZZ` agregable, tras reintentar aparecen los globales y se conserva `ZZ`.
ID: TC-SIZE-53 — Caso: guardar, reabrir y vista previa con globales. Tipo: regression. Pasos: guardar un producto con globales y propios (usar un producto de prueba); reabrirlo y ver la vista previa. Esperado: el PUT lleva `size_guide.columnSources`; al reabrir cada columna conserva su origen aunque el talle se renombre o desactive en el catálogo; la guía pública no cambia. Resultado: ok (2026-10-26, base real, producto de prueba borrado): el guardado lleva size_guide.columnSources solo con la columna global (sizeId) y las medidas precargadas; al reabrir XL figura Global y XXL Propio; la vista previa y la guía pública a 375px muestran lo mismo. Con el global desactivado se conserva (ver TC-SIZE-50); que el talle se renombre en el catálogo: no probado.
ID: TC-SIZE-54 — Caso: guías existentes y guía ya editada. Tipo: edge. Pasos: abrir un producto con `size_guide` sin `columnSources`; en un producto nuevo tocar la guía antes de que cargue el catálogo. Esperado: todas las columnas figuran como "Propio" y no se altera nada; una guía editada o guardada nunca se vacía al terminar de cargar el catálogo. Resultado: parcial (2026-10-26): un producto real con guía anterior sin columnSources (Modare Moño) abre con todas las columnas "Propio", sin errores y sin guardarse; tocar la guía de un producto nuevo antes de que cargue el catálogo: no probado.
ID: TC-SIZE-55 — Caso: mobile 375px del editor de guía. Tipo: mobile/a11y. Pasos: Variantes > Guía de talles a 375px; recorrer con teclado (Tab, Enter, Espacio). Esperado: sin scroll horizontal de página; chips y botones de al menos 44px; foco visible; chips globales con aria-pressed; error anunciado. Resultado: parcial: 375px sin scroll horizontal y alturas mínimas de 44px ok (2026-10-26). Teclado ok (2026-10-27): un Tab desde "Calzado" llega al chip con foco visible (contorno de 2px), Espacio y Enter alternan aria-pressed, Tab llega a "Quitar talle" y al campo de talle propio, Enter agrega y quita. Árbol de accesibilidad ok: grupo "Talles globales", botón [pressed], lista "Talles de la guía", campo con etiqueta y error de duplicado en aria-live polite. Con un lector de pantalla real (NVDA, VoiceOver): no probado. Menores previos sin corregir: celdas de la tabla de medidas nombradas solo por placeholder y encabezado vacío en la columna de borrar.
ID: TC-SIZE-56 — Caso: compra con talle, hasta el pago. Tipo: regression. Pasos: con una cuenta habilitada para comprar, abrir un producto con talle y color; intentar agregar sin elegir; elegir talle y color; agregar al carrito; ir al checkout; elegir retiro en local y Mercado Pago. Esperado: sin elegir pide "Color, Talle"; el color disponible depende del talle; el carrito y el resumen del checkout muestran "Color … · Talle …" con el total; en el paso Pago queda elegido Mercado Pago con "CONTINUAR AL PAGO" habilitado. Resultado: parcial (2026-10-27, backend local contra la base real, producto "Zapato Stiletto", talle 38, color Cherry): ok hasta el paso de Pago sin crear ninguna orden; crear la orden (descuento de stock por talle), la redirección a Mercado Pago y el botón "Ir a pagar" del carrito: no probado.

## Seguridad de sesión + CSP + captcha (2026-10-11)

ID: TC-SEC-01 — Caso: login por `/api/auth/login`; `localStorage`/`sessionStorage` sin tokens y `document.cookie` vacío (cookie httpOnly). Tipo: security. Esperado: sesión iniciada, sin credenciales legibles por JS. Resultado: ok (Playwright, preview con CSP)
ID: TC-SEC-02 — Caso: recargar con sesión iniciada. Tipo: happy. Esperado: `POST /api/auth/refresh` 200 y el usuario sigue logueado. Resultado: ok
ID: TC-SEC-03 — Caso: logout y luego refresh. Tipo: security. Esperado: logout 200, refresh 401. Resultado: ok
ID: TC-SEC-04 — Caso: contraseña incorrecta. Tipo: failure. Esperado: 401 "Credenciales inválidas" y mensaje "Email o contraseña incorrectos". Resultado: ok (API); UI no probada
ID: TC-SEC-05 — Caso: `POST /api/auth/refresh` con `Origin` ajeno. Tipo: security. Esperado: 403. Resultado: ok
ID: TC-SEC-06 — Caso: recargar `/admin` con sesión admin. Tipo: edge. Esperado: loader y luego panel, sin rebotar al Home. Resultado: no probado
ID: TC-SEC-07 — Caso: usuario con claves viejas en localStorage (`db_*`, `sb-*-auth-token`). Tipo: edge. Esperado: se borran al cargar la app. Resultado: no probado
ID: TC-SEC-08 — Caso: cambiar contraseña logueado (actual correcta / incorrecta). Tipo: happy/failure. Esperado: ok fuerza re-login; incorrecta muestra "La contraseña actual es incorrecta". Resultado: no probado
ID: TC-SEC-09 — Caso: Home, mapa del footer y panel Cloudinary con la CSP de `vercel.json`. Tipo: security. Esperado: sin violaciones de CSP en consola. Resultado: Home y mapa ok; Cloudinary, Checkout (georef) y Mercado Pago no probados
ID: TC-SEC-10 — Caso: captcha con `VITE_TURNSTILE_SITE_KEY` definida y CAPTCHA activo en Supabase (login, registro, recuperación, reenvío, cambio de contraseña). Tipo: security. Esperado: widget visible y envío bloqueado hasta resolverlo. Resultado: no probado (falta crear el widget en Cloudflare)
ID: TC-SEC-11 — DEPRECATED (se eliminó el login con Google).
ID: TC-PERF-01 — Caso: visitante anónimo recarga varias veces. Tipo: happy/performance. Pasos: borrar `localStorage`, abrir el Home y recargar 3 veces mirando la pestaña Network. Esperado: un solo `POST /api/auth/refresh` en la primera carga (401) y ninguno en las recargas siguientes. Resultado: ok (Playwright con refresh simulado 401, 2026-10-23).
ID: TC-PERF-02 — Caso: login tras tener la marca de "sin sesión". Tipo: edge. Pasos: con la marca `lia:auth-no-session` puesta, iniciar sesión y recargar. Esperado: la marca se borra al loguear y la sesión se recupera tras recargar. Resultado: no probado.
ID: TC-PERF-03 — Caso: usuario con sesión activa antes del deploy (sin marca) abre el sitio. Tipo: regression. Esperado: sigue logueado (el refresh se intenta una vez). Resultado: no probado.
ID: TC-PERF-04 — Caso: cambio en vivo del banner / color del navbar / tema / tipografía con un solo canal Realtime. Tipo: happy. Pasos: abrir el sitio público en una pestaña y desde el admin cambiar cada uno. Esperado: la pestaña pública se actualiza sin recargar en los cuatro casos; en DevTools hay una sola suscripción `public:site_content`. Resultado: no probado.
ID: TC-PERF-05 — Caso: imágenes redimensionadas. Tipo: happy. Pasos: abrir un producto, "Mis compras" (con una compra), checkout y resultado de pago. Esperado: las URLs de Cloudinary llevan `w_…,f_auto,q_auto`; se ven nítidas en pantalla retina. Resultado: ok en detalle de producto (Playwright, `w_600…1200` y miniaturas `w_160`); resto no probado.
ID: TC-PERF-06 — Caso: error de render. Tipo: failure. Pasos: forzar un error en un componente (p. ej. lanzar una excepción en dev) o simular un chunk inexistente. Esperado: pantalla "Algo salió mal" con "Recargar la página" e "Ir al inicio"; accesible por teclado. Resultado: no probado.

## Validación de datos de usuario (alta / cambio / recuperación de contraseña)

ID: TC-VAL-01 — Caso: límites de nombre en "Crear Cuenta". Tipo: edge. Pasos: escribir 61 letras; pegar 200 letras; dejar 1 letra; escribir `<b>x</b>`, `Ana 😀`, `1234`. Esperado: el campo no deja pasar de 60; con 1 letra, símbolos, números o emoji muestra el error del campo y no envía; la ayuda "2 a 60 caracteres…" está visible. Resultado: no probado.
ID: TC-VAL-02 — Caso: nombres legítimos. Tipo: happy. Pasos: registrar `María José`, `O'Brien`, `José-Luis Núñez`. Esperado: se aceptan y el perfil queda con ese nombre. Resultado: no probado.
ID: TC-VAL-03 — Caso: reglas de contraseña. Tipo: edge. Pasos: probar `Abc1!` (corta), `abcdefgh`, `abcdefg1`, `abcdefg!`, `12345678!`, 65 caracteres, `Abcdef1!` (válida), una frase de 40 caracteres con espacios, número y símbolo. Esperado: cada inválida muestra su error específico (falta letra / número / símbolo / largo); la válida y la frase pasan; el campo no deja escribir más de 64. Resultado: no probado.
ID: TC-VAL-04 — Caso: mismas reglas en "Cambiar contraseña" y en el link de recuperación. Tipo: regression. Pasos: repetir TC-VAL-03 en ambos formularios. Esperado: mismos errores y misma ayuda; la contraseña de 6 caracteres que antes pasaba ahora se rechaza. Resultado: no probado.
ID: TC-VAL-05 — Caso: un usuario existente con contraseña antigua de 6 caracteres inicia sesión. Tipo: regression. Esperado: el login NO aplica las reglas nuevas y entra normalmente. Resultado: no probado.
ID: TC-VAL-06 — Caso: celular y email. Tipo: edge. Pasos: celular de 21 caracteres, con letras, `+54 11 1234-5678`; email de 255 caracteres. Esperado: los inválidos se rechazan con mensaje; el válido pasa; el email no deja pasar de 254. Resultado: no probado.
ID: TC-VAL-07 — Caso: alta saltándose el front (API de Auth con la anon key, entorno de prueba, DESPUÉS de aplicar `2026-10-25_signup_input_validation.sql`). Tipo: security. Pasos: POST `/auth/v1/signup` con `data.name` = 300 letras, `<script>alert(1)</script>`, `'; DROP TABLE profiles;--`. Esperado: el alta falla, no queda fila en `auth.users`. Resultado: no probado.
ID: TC-VAL-08 — Caso: panel Admin → Usuarios con un nombre/email muy largo (cuenta vieja). Tipo: edge / mobile. Pasos: abrir a 375px y a 1440px. Esperado: una línea con elipsis, sin scroll horizontal por ese texto; el tooltip muestra el valor completo. Resultado: no probado.

## Miniaturas del admin con transformaciones de Cloudinary
ID: TC-IMG-01 — Caso: listados del admin (Productos en tabla y en tarjetas, Destacados, Galería, Despachos, gestor y selector de Cloudinary). Tipo: regresión/performance. Pasos: abrir cada pantalla con DevTools → Network → Img. Esperado: las miniaturas de `res.cloudinary.com` se piden con `/upload/w_240,...` (grillas de Cloudinary `w_400`), se ven nítidas y sin deformarse, cargan en diferido; productos sin imagen siguen mostrando su placeholder. Resultado: ok (2026-10-26, Playwright headless contra el front local, 1280 y 375 px): Productos 10/10 imágenes de Cloudinary transformadas (miniatura 4 KB vs original 34 KB), grilla del gestor de Cloudinary 100/100 (8 KB vs 34 KB), Destacados transformadas; 0 imágenes rotas y 0 errores de página. Despachos no tenía imágenes de Cloudinary para comprobar; Galería y selector de imágenes no se recorrieron.
ID: TC-IMG-02 — Caso: imagen que no es de Cloudinary o URL sin `/upload/`. Tipo: edge. Esperado: se muestra igual, sin transformar y sin error. Resultado: ok parcial (la imagen `cld-sample.jpg` de otra pantalla sigue sin transformar y carga bien); URL externa a Cloudinary: no probado.

## Recorrido de secciones públicas y de usuario (2026-10-26, Playwright headless, front y backend locales)
ID: TC-SITE-01 — Caso: Home, Catálogo (20 productos), ficha de producto, Acerca de, Contacto y /checkout vacío en 1280 px y 375 px. Tipo: regresión. Esperado: sin imágenes rotas, sin errores de JS ni respuestas 5xx, sin scroll horizontal en móvil. Resultado: ok (36 verificaciones).
ID: TC-SITE-02 — Caso: formulario de registro con nombre con números, celular inválido y contraseñas sin minúscula / sin mayúscula / sin símbolo / cortas; y datos válidos (José María, +54 11 5555-1234, Clave1234!). Tipo: edge/security. Esperado: cada error con su mensaje exacto; los datos válidos no dan error de nombre/celular/contraseña. Resultado: ok; el alta a Supabase se bloqueó en la prueba (0 cuentas creadas).
ID: TC-SITE-03 — Caso: login con credenciales malas y con usuario común; menú de perfil; Mis compras (estado vacío 'Aún no realizaste compras.'); Cambiar contraseña con 3 contraseñas inválidas. Tipo: happy/edge. Resultado: ok; el cambio real de contraseña se bloqueó en la prueba.
ID: TC-SITE-04 — Caso: cuenta habilitada, elegir color y talle, agregar al carrito, /checkout paso Entrega (retiro en local / Correo Argentino) y paso Pago (Mercado Pago y transferencia). Tipo: happy. Resultado: ok hasta antes de confirmar; no se creó ninguna orden. Sin probar: pago en Mercado Pago, Safari iPhone, Chrome Android, registro real con email de confirmación.


## Botón de arrepentimiento y número de pedido (2026-10-26)
ID: TC-ARR-01 — Caso: enlace en el Footer. Tipo: happy / a11y. Pasos: abrir Home, Contacto y un producto, bajar al Footer; recargar con la red lenta (el Footer en skeleton). Esperado: "BOTÓN DE ARREPENTIMIENTO" (texto exacto) visible en todas, también durante la carga; se llega con Tab y tiene foco visible; lleva a /arrepentimiento. Resultado: ok (e2e/withdrawal.spec.ts, Chromium, con el backend simulado); con red lenta y Tab: no probado.
ID: TC-ARR-02 — Caso: formulario vacío. Tipo: edge. Esperado: errores por campo (nombre, email, qué compraste), foco en el primero con error, sin request al backend. Resultado: ok (e2e, Chromium).
ID: TC-ARR-03 — Caso: nombre de 1 letra y de 61, email sin arroba o de 255 caracteres, descripción de 4 y de 501, N° de pedido `abc`, `0`, `-5`, `1.5`, `#1001`, 10 dígitos, vacío. Tipo: edge. Esperado: cada inválido muestra su error; `#1001` y vacío pasan; la descripción no deja escribir más de 500. Resultado: ok parcial (e2e: `abc`); resto no probado.
ID: TC-ARR-04 — Caso: envío exitoso sin sesión. Tipo: happy. Esperado: se muestra el código ARR-AAAA-NNNN, el botón "Copiar código" y el aviso de 24 h; el foco pasa al título; aclara que no se envía mail. Resultado: ok (e2e con backend simulado); contra backend real: no probado.
ID: TC-ARR-05 — Caso: doble click / Enter repetido en "Solicitar arrepentimiento". Tipo: concurrencia. Esperado: una sola solicitud; el botón queda deshabilitado con "Enviando…". Resultado: ok (e2e, Chromium).
ID: TC-ARR-06 — Caso: error 500, red caída y 429. Tipo: failure. Esperado: 500 y red caída muestran un mensaje humano y conservan lo escrito; 429 pide esperar. Resultado: 500 y 429 ok (e2e); red caída: no probado.
ID: TC-ARR-07 — Caso: usuario logueado (no admin) abre /arrepentimiento. Tipo: happy. Esperado: nombre y email precargados y editables. Resultado: no probado.
ID: TC-ARR-08 — Caso: admin con sesión abre /arrepentimiento. Tipo: edge. Esperado: la página abre (no redirige a /admin) sin Footer público. Resultado: no probado.
ID: TC-ARR-09 — Caso: /arrepentimiento en 320, 375, 768 y 1440 px. Tipo: mobile / a11y. Esperado: sin scroll horizontal, botones de al menos 44 px, contraste legible, el código largo se parte sin desbordar. Resultado: no probado (WebKit no está instalado en la máquina de prueba).
ID: TC-ARR-10 — Caso: Admin > Arrepentimientos con 0, 1 y más de 50 solicitudes. Tipo: estados. Esperado: loading, vacío con texto, error con "Reintentar", lista y paginación. Resultado: no probado (requiere backend).
ID: TC-ARR-11 — Caso: cambiar estado y nota de una solicitud; filtrar por estado. Tipo: happy / failure. Esperado: "Guardar" solo se habilita con cambios, muestra "Cambios guardados" y la tarjeta refleja el estado; si falla, muestra el error y conserva lo escrito. Resultado: no probado (requiere backend).
ID: TC-ARR-12 — Caso: solicitud sin compra vinculada. Tipo: edge. Esperado: la tarjeta marca "Requiere revisión manual" y "No encontramos una compra con ese email". Resultado: no probado (requiere backend).
ID: TC-ARR-13 — Caso: solicitud con email de HTML o texto de 500 caracteres (`<script>alert(1)</script>`, emojis). Tipo: security. Esperado: se muestra como texto plano en el admin, sin ejecutar nada ni desbordar. Resultado: no probado.
ID: TC-PED-01 — Caso: "Mis compras" con una compra nueva y una anterior a la numeración. Tipo: regresión. Esperado: la nueva muestra "Pedido #N" en la lista y en el detalle; la anterior no muestra nada raro. Resultado: no probado (requiere backend con `order_number`).
ID: TC-PED-02 — Caso: Ventas y Despachos del admin antes y después de aplicar el script SQL de `order_number`. Tipo: regresión / failure. Esperado: antes, siguen cargando (columna "Pedido" con guion); después, muestran "#N". Resultado: no probado (requiere la base).

## Footer legal: datos del vendedor y Data Fiscal (2026-10-26)
ID: TC-LEG-01 — Caso: Footer sin ningún dato legal cargado. Tipo: happy / estados. Esperado: no aparece el bloque "Datos del vendedor" ni el sello Data Fiscal; el "BOTÓN DE ARREPENTIMIENTO" sigue visible. Resultado: ok (e2e/footer-legal.spec.ts, Chromium, con site_content simulado).
ID: TC-LEG-02 — Caso: solo razón social y CUIT cargados. Tipo: edge. Esperado: el bloque muestra solo esas dos filas, sin etiquetas ni texto de relleno de las vacías. Resultado: ok (e2e, Chromium).
ID: TC-LEG-03 — Caso: Admin > Configuración del sitio, CUIT `20-12345678-6`, `20123456786`, con dígito verificador incorrecto, corto, con letras y vacío. Tipo: edge. Esperado: válidos los dos primeros y el vacío; los otros muestran su error inline y "Guardar" se frena con un aviso. Resultado: ok a nivel función (validación probada en el navegador); pantalla de admin con sesión: no probado.
ID: TC-LEG-04 — Caso: guardar razón social de 121 caracteres, domicilio de 201, horario de 121, área de 101. Tipo: edge. Esperado: error inline "máximo N caracteres" y no se guarda. Resultado: no probado.
ID: TC-LEG-05 — Caso: pegar el código oficial de ARCA (Formulario 960/D). Tipo: happy. Esperado: se guarda solo el enlace (normalizado a https) y la imagen; el Footer muestra el sello con enlace en pestaña nueva y `rel="noopener noreferrer"`. Resultado: ok a nivel función y render (e2e con datos simulados); guardado real desde el admin: no probado.
ID: TC-LEG-06 — Caso: pegar código con host ajeno, `javascript:`, `qr.afip.gob.ar.evil.example`, `qr.afip.gob.ar@evil.example`, texto sin enlace y un `<script>` previo. Tipo: security. Esperado: los cuatro primeros y el texto sin enlace se rechazan con mensaje humano; el `<script>` no se ejecuta y solo se toma el enlace válido. Resultado: ok (probado en el navegador).
ID: TC-LEG-07 — Caso: `dataFiscalUrl` con host ajeno ya guardado en la base. Tipo: security. Esperado: el Footer no renderiza el sello (se revalida al mostrar). Resultado: ok (e2e, Chromium).
ID: TC-LEG-08 — Caso: Footer con todos los datos y textos largos a 320 y 375 px. Tipo: mobile. Esperado: sin scroll horizontal, texto largo partido. Resultado: ok (e2e, Chromium con viewport angosto; Safari iPhone: no probado).
ID: TC-LEG-09 — Caso: la imagen oficial de Data Fiscal bajo la CSP de producción (`img-src https:`). Tipo: security / regresión. Esperado: se carga sin violación de CSP. Resultado: no probado en Vercel; revisado a mano contra `vercel.json` (img-src permite https:).
ID: TC-LEG-10 — Caso: detalle de producto con política de devolución cargada. Tipo: regresión. Esperado: el título dice "Política de devolución" (no "Devolución gratis") y muestra el texto del producto sin cambios. Resultado: no probado visualmente.
ID: TC-ARR-14 — Caso: formulario de arrepentimiento con N° de pedido "abc", importe "mucho", sin esos datos y con "#1001", fecha y "15.000,50". Tipo: edge. Esperado: vacío es válido (los datos de la compra son opcionales); "abc" muestra "Ingresá solo el número, por ejemplo 1001"; un importe inválido muestra su error; "#1001" se acepta. Resultado: ok (e2e, Chromium).
ID: TC-LEG-11 — Caso: abrir /terminos, /privacidad y /cambios-y-devoluciones desde el Footer, con y sin sesión, a 320 y 375 px. Tipo: happy / mobile. Esperado: título, aviso de borrador, sin scroll horizontal; "Cambios y devoluciones" enlaza al botón de arrepentimiento. Resultado: ok (e2e, Chromium); con sesión y Safari iPhone: no probado.
ID: TC-LEG-12 — DEPRECATED (reemplazado por TC-LEG-18 y TC-LEG-19: la casilla ya no se pide en cada compra).
ID: TC-LEG-13 — DEPRECATED (la aceptación ahora es por cuenta y versión; ver TC-LEG-17 a TC-LEG-20).
ID: TC-ARR-15 — Caso: la constancia del arrepentimiento llega por mail al cliente y aviso al local. Tipo: happy. Esperado: mail con el código ARR-… en minutos; el aviso llega a MAIL_NOTIFY_TO. Resultado: no probado (requiere backend desplegado con credenciales SMTP).
ID: TC-LEG-14 — Caso: Footer con el enlace a la ventanilla de reclamos y el botón de arrepentimiento a 320, 375, 768 y 1440 px. Tipo: mobile. Esperado: el enlace abre https://autogestion.produccion.gob.ar/consumidores en pestaña nueva con noopener; el botón es chico, sin subrayado y sin desborde. Resultado: ok a 375 y 1440 (captura) y sin desborde a 320 y 375 (e2e); 768: no probado; el destino real del enlace: no verificado (el portal responde "Portal de Trámites", sin confirmar que sea la ventanilla de consumidores).
ID: TC-LEG-15 — Caso: "Mis compras" muestra el enlace BOTÓN DE ARREPENTIMIENTO y al tocarlo cierra el modal y abre el formulario. Tipo: happy. Resultado: no probado (requiere sesión).
ID: TC-LEG-16 — Caso: leyenda de datos personales en arrepentimiento, contacto, registro y paso Pago. Tipo: regresión. Resultado: ok solo en arrepentimiento (e2e); contacto, registro y pago: no probado visualmente.
ID: TC-LEG-17 — Caso: registro sin tildar los términos, y tildándolos. Tipo: failure / happy. Esperado: sin tilde aparece "Aceptá los términos y la política de privacidad para crear tu cuenta." y no sale ningún pedido a Supabase; con tilde se crea la cuenta con `terms_version` y `terms_accepted_at` en sus datos y se envía la constancia a `/api/terms/registration`. Resultado: ok (e2e y navegador, Chromium; backend y Supabase simulados); con Supabase real y Safari iPhone: no probado.
ID: TC-LEG-18 — Caso: paso Pago con una cuenta que no aceptó la versión vigente. Tipo: happy / failure. Esperado: casilla con la versión; sin tildar el botón queda deshabilitado con "Aceptá los términos y condiciones para continuar."; al pagar primero se registra la aceptación y recién después se crea el pedido. Resultado: ok (e2e, Chromium; backend simulado); con backend real: no probado.
ID: TC-LEG-19 — Caso: paso Pago con una cuenta que ya aceptó la versión vigente. Tipo: happy. Esperado: aviso fijo "Al pagar aceptás los Términos y condiciones (versión X)…", sin casilla, y no se vuelve a registrar la aceptación. Resultado: ok (e2e, Chromium; backend simulado).
ID: TC-LEG-20 — Caso: el admin publica una versión nueva mientras el cliente está en el paso Pago. Tipo: edge. Esperado: al pagar el backend responde 409; se avisa "Los términos y condiciones cambiaron…", la casilla vuelve a pedirse con la versión nueva y no se crea el pedido. Resultado: ok (e2e, Chromium; backend simulado). Cliente que ya veía el aviso fijo cuando cambió la versión: el 409 `TERMS_NOT_ACCEPTED` frena el pago con su mensaje y recargar muestra la casilla; no probado.
ID: TC-LEG-21 — Caso: admin > Términos y condiciones: abrir desde el menú, editar, publicar corrección y publicar cambio importante. Tipo: happy. Esperado: "Publicar" deshabilitado sin cambios; la corrección conserva la versión; el cambio importante guarda una versión nueva (AAAA-MM-DD, `.2` si es el mismo día); la vista previa se actualiza. Resultado: ok (e2e y navegador, Chromium; Supabase simulado); guardar contra Supabase real con RLS de admin: no probado.
ID: TC-LEG-22 — Caso: texto de los términos con enlace `javascript:`, enlace externo, enlace interno, listas y HTML crudo. Tipo: security. Esperado: solo se enlazan rutas internas (`/…`) y `https://`; `javascript:` se muestra como texto; el HTML no se interpreta. Resultado: ok para `javascript:`, enlaces e ítems (e2e); HTML crudo: no probado.
ID: TC-LEG-23 — Caso: editor de términos a 320 y 375 px y con un texto de 50.000 caracteres o vacío. Tipo: mobile / edge. Esperado: sin scroll horizontal; el botón se deshabilita y se muestra el error. Resultado: no probado.
ID: TC-LEG-24 — Caso: /cambios-y-devoluciones sin texto publicado. Tipo: happy / regresión. Esperado: muestra el formato de preguntas y respuestas con 6 puntos `[A DEFINIR]`, habla de retiro en el local y no menciona fletes ni operadores logísticos; enlaza una vez al botón de arrepentimiento. Resultado: ok (e2e, Chromium; Supabase simulado).
ID: TC-LEG-25 — Caso: /cambios-y-devoluciones con texto publicado por el admin. Tipo: happy. Esperado: muestra ese texto y no quedan `[A DEFINIR]`. Resultado: ok (e2e, Chromium; Supabase simulado).
ID: TC-LEG-26 — Caso: Admin > Arrepentimientos: botón "Editar Cambios y devoluciones" y "Volver a Arrepentimientos". Tipo: happy / mobile. Esperado: el botón lleva al editor y el enlace vuelve; a 375 px sin desborde y botones de 44 px. Resultado: ok (e2e Chromium; 375 px en navegador); 320 px y Safari iPhone: no probado.
ID: TC-LEG-27 — Caso: editor de Cambios y devoluciones con puntos `[A DEFINIR]`, completarlos y publicar. Tipo: edge. Esperado: avisa "Quedan N puntos [A DEFINIR] sin completar."; el aviso desaparece al completarlos; publicar guarda `legal_returns` sin versión y sin casilla de nueva aceptación. Resultado: ok (e2e, Chromium; Supabase simulado); guardar contra Supabase real con RLS de admin: no probado.
ID: TC-LEG-28 — Caso: intentar publicar el texto con `[A DEFINIR]` sin completar (uno o varios). Tipo: edge. Esperado: "Publicar" queda deshabilitado y el aviso dice que no se puede publicar hasta completarlos; al completar el último se habilita. Resultado: ok (e2e, Chromium).
