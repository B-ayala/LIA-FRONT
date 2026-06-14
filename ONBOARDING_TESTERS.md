# Onboarding - Guía para Testers

> **Proyecto:** LIA - Tienda de Indumentaria Artesanal  
> **Stack:** React + TypeScript + Vite  
> **Base URL:** `/LIA`

---

## ¿Qué es este proyecto?

LIA es una **tienda online de productos artesanales tejidos**. Los clientes pueden:
- Ver el catálogo de productos
- Ver detalles de cada producto (imágenes, precios, variantes, reviews)
- Simular una compra (checkout)
- Contactar a la tienda

Además tiene un **panel de administración** para gestionar productos, usuarios y contenido del sitio.

---

## Páginas del Sitio Web

### 1. Home (`/`)
**¿Qué hace?** Es la página de bienvenida.
- Muestra un banner principal (hero)
- Destaca productos recomendados
- Muestra información de la marca
- Tiene links a las demás secciones

**Funcionalidades a testear:**
- Carga de imágenes del hero
- Carruseles de productos destacados
- Botones de "Ver más" que llevan al catálogo
- Responsive en mobile

---

### 2. Catálogo de Productos (`/products`)
**¿Qué hace?** Muestra todos los productos disponibles.
- Lista de productos en formato grilla
- Cada producto muestra: imagen, nombre, precio, descuento, rating
- Filtros laterales: por categoría, precio, disponibilidad
- Barra de búsqueda de productos
- Indicadores de "Envío gratis" y "Nuevo"

**Funcionalidades a testear:**
- Aplicar/quitár filtros
- Búsqueda por nombre
- Ordenar productos
- Paginación (si hay muchos productos)
- Tarjetas de producto con badges correctos

---

### 3. Detalle de Producto (`/product/:id`)
**¿Qué hace?** Muestra toda la información de un producto específico.
- **Galería de imágenes:** Múltiples fotos, zoom, navegación
- **Info principal:** Nombre, precio, descripción
- **Variantes:** Selector de talla y color
- **Reviews:** Comentarios y ratings de otros clientes
- **Preguntas frecuentes (FAQs):** Respuestas a dudas comunes
- **Especificaciones:** Material, cuidados, origen, peso
- **Features:** Lista de características destacadas
- **Garantía y devoluciones:** Políticas del producto

**Funcionalidades a testear:**
- Cambiar entre imágenes del producto
- Seleccionar talla/color (debe actualizar disponibilidad)
- Ver todas las reviews
- Expandir/cerrar FAQs
- Botón "Añadir al carrito"

---

### 4. Checkout (`/checkout`)
**¿Qué hace?** Proceso de compra del carrito.
- Muestra resumen del pedido
- Lista de productos añadidos
- Ajustar cantidades
- Ver costos totales

**Funcionalidades a testear:**
- Agregar/eliminar productos del carrito
- Modificar cantidades
- Calcular totales correctamente
- Validaciones de formulario
- Flujo completo de compra

---

### 5. Contacto (`/contact`)
**¿Qué hace?** Formulario para que los clientes envíen mensajes.
- Campos: nombre, email, asunto, mensaje
- Validación de campos obligatorios
- Mensaje de confirmación al enviar

**Funcionalidades a testear:**
- Validación de campos vacíos
- Validación de formato de email
- Mensajes de error
- Confirmación de envío exitoso

---

### 6. Sobre Nosotros (`/about`)
**¿Qué hace?** Página informativa de la marca.
- Historia de la marca
- Valores y misión
- Imágenes del equipo o taller

**Funcionalidades a testear:**
- Carga de imágenes
- Responsive del contenido
- Links a redes sociales

---

## Panel de Administración

**URL base:** `/admin`

### Login
- Acceso protegido con credenciales
- Redirección si no está autenticado

### Dashboard (`/admin` o `/admin/home`)
**¿Qué hace?** Vista general del sitio.
- Estadísticas de productos
- Accesos rápidos a las secciones de gestión

### Gestión de Productos (`/admin/products`)
**¿Qué hace?** CRUD completo de productos.
- **Tabla de productos:** Lista con filtros y ordenamiento
- **ProductActions:** Botones de Editar, Eliminar, Duplicar
- **ProductBadges:** Indicadores visuales (stock bajo, sin stock, envío gratis, etc.)
- **VariantTable:** Tabla para gestionar tallas y colores
- **Formulario de edición:** Crear/modificar productos con todos los campos

**Funcionalidades a testear:**
- Crear nuevo producto
- Editar producto existente
- Eliminar producto
- Duplicar producto
- Filtros de la tabla
- Selección múltiple de productos
- Gestión de variantes (agregar/quitar tallas y colores)
- Subida de imágenes

### Gestión de Usuarios (`/admin/users`)
**¿Qué hace?** Administrar usuarios del sistema.
- Lista de usuarios registrados
- Editar información de usuarios
- Activar/desactivar cuentas

### Editor de About (`/admin/about`)
**¿Qué hace?** Modificar el contenido de la página Sobre Nosotros.
- Editor de texto
- Cambiar imágenes

### Configuración del Sitio (`/admin/site-config`)
**¿Qué hace?** Configurar el footer y datos de contacto.
- Links de redes sociales
- Información de contacto
- Copyright

---

## Componentes Comunes (aparecen en varias páginas)

### Navbar
- Logo de la marca
- Links de navegación
- Icono del carrito (con contador de items)
- Menú hamburguesa en mobile

### Modal
- Ventanas emergentes para confirmaciones
- Formularios de edición
- Alertas importantes

### Footer
- Links a redes sociales
- Información de contacto
- Copyright
- Links legales

### Botón flotante de WhatsApp
- Siempre visible (excepto en admin)
- Abre chat de WhatsApp al hacer clic

---

## Datos de Prueba

Los productos están definidos en `src/data/products.ts`. Hay **8 productos** de ejemplo con:
- Nombres, precios, descripciones
- Múltiples imágenes
- Variantes de talla y color
- Reviews de usuarios
- FAQs
- Especificaciones técnicas

---

## Comandos para Empezar

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# La app se abre en: http://localhost:5173/LIA
```

---

## Tips para Testing

1. **Navegación:** Usa el menú principal para moverte entre páginas
2. **Responsive:** Proba en diferentes tamaños de pantalla (mobile 375px, tablet 768px, desktop 1440px)
3. **Admin:** Accede al panel admin y testea el CRUD completo
4. **Productos:** Verificá que las variantes (talla/color) funcionen correctamente
5. **Modales:** Fijate que se cierren al hacer clic fuera o en la X
6. **Imágenes:** Verificá que carguen todas las imágenes de productos
7. **Formularios:** Intentá enviar con campos vacíos para ver validaciones

---

## ¿Dudas?

Consultá el código en:
- Rutas: `src/routes/AppRouter.tsx`
- Componentes: `src/components/`
- Admin: `src/admin/`
- Datos: `src/data/products.ts`

