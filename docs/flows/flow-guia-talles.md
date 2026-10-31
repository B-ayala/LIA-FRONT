# Flujo: Guía de talles de un producto

## Objetivo
Publicar en cada producto una guía de talles clara y verificable, sin mostrar datos que el admin no confirmó.

## Actores
- Admin (carga talles globales, la guía general y la guía de cada producto)
- Cliente (consulta "Ver guía de talles" en el detalle)
- Backend `/api/products` (valida y guarda `productos.size_guide`)
- Supabase `site_content` (guía general: cómo medirse, aclaraciones y modelo; clave `size_guide_content`)

## Pre-condiciones
- Producto con al menos una variante (si no, no hay botón de guía).
- Para la guía general: sesión admin (RLS de `site_content`). La foto de la modelo se sube antes en "Imágenes" (Cloudinary).

## Pasos principales (happy path)
1. El admin abre un producto > Variantes > Guía de talles.
2. Una guía nueva de indumentaria arranca con filas Busto/Cintura/Cadera/Entrepierna vacías.
3. Elige talles (globales o propios) y carga valores reales (fabricante o prenda medida).
4. Indica unidad y si las medidas son del cuerpo o de la prenda.
5. "Qué más ve el cliente": aclaraciones generales o propias; modelo general, propia o no mostrar.
6. Vista previa → se valida la guía → Guardar: `PUT /api/products` con `sizeGuide`.
7. El cliente abre la guía: tabla, cómo medirse, aclaraciones y calce.

## Caminos alternativos
- Si no toca la estructura precargada → no se guarda guía; la tienda dice "pendientes de completar".
- Si la tabla está incompleta → celdas "Pendiente" y aviso.
- Si la guía no indica la base o no tiene valores → no se muestra la aclaración "corresponden a …".
- Si no hay aclaraciones propias → se usan las generales (cambiarlas impacta en todos esos productos).
- Modelo "La general" → la de Talles › Guía de talles general, solo en indumentaria; sin cargar, no se muestra nada.
- Modelo "Propia" → la del producto (arranca copiando la general); "No mostrar" → sin bloque.
- Si la guía es de calzado o el producto no tiene guía → no se muestra "¿Cómo tomar tus medidas?".
- Si la modelo no tiene datos de texto → no se muestra (una foto sola no es una referencia).
- Si se elige un talle global → sus medidas se copian a la guía (snapshot); editar el talle global después no cambia guías ya guardadas.

## Errores esperados
- Valor sin número, fila sin nombre, medida repetida, altura fuera de 100–230, foto no https o sin datos de la modelo, aclaración vacía → mensaje en Variantes, no deja continuar.
- Guía general con instrucción vacía, aclaración vacía o foto sin datos de la modelo → mensaje junto a "Publicar", no se guarda.
- Payload inválido directo a la API → 400 de validación.
- Falla al cargar la guía general → admin: "Reintentar" sin formulario; tienda: textos por defecto (genéricos) y sin modelo general.

## Diagrama
```mermaid
sequenceDiagram
  actor Admin
  participant Front as Admin (ProductModal)
  participant API as Backend /api/products
  participant DB as productos.size_guide
  participant SC as site_content (size_guide_content)
  actor Cliente
  Admin->>Front: Completa tabla, base, aclaraciones, calce
  Front->>Front: findGuideProblem / cleanGuideInfo
  Front->>API: PUT sizeGuide
  API->>API: sizeGuideSchema (zod)
  API->>DB: UPDATE size_guide (JSONB)
  Cliente->>DB: Lee producto (Supabase anon)
  Cliente->>SC: Lee textos globales
  Cliente->>Cliente: SizeGuideView (solo datos cargados)
```

## Datos involucrados
- `productos.size_guide`: `type`, `columns`, `rows`, `columnSources` (existentes) + `unit`, `measurementBasis`, `notes`, `fitReferenceMode`, `fitReference` (opcionales, nuevos).
- `site_content['size_guide_content']`: `howToMeasure` (busto, cintura, cadera, entrepierna), `notes` (con token `{medidas}`) y `fitReference` (modelo general, opcional).
- `talles.measurements`: un talle global nuevo precarga los nombres de las medidas estándar.
