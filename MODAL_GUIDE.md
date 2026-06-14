# Sistema de Modales - Guía Rápida

## Estructura Simple

```
src/components/Modal/
├── Modal.tsx    # Componente modal reutilizable
├── Modal.css    # Estilos globales del modal
└── index.ts     # Exportaciones
```

## Uso Básico

### 1. Importar el Modal

```tsx
import { Modal } from '../../components/Modal';
```

### 2. Usar en tu componente

```tsx
const MyComponent = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Abrir Modal</button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Mi Título"
        size="medium"
      >
        <p>Contenido del modal</p>
      </Modal>
    </>
  );
};
```

## Props Disponibles

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | **Requerido.** Controla si el modal está abierto |
| `onClose` | `() => void` | - | **Requerido.** Función para cerrar el modal |
| `title` | `string` | - | Título del modal (opcional) |
| `children` | `ReactNode` | - | Contenido del modal |
| `size` | `'small' \| 'medium' \| 'large' \| 'fullscreen'` | `'medium'` | Tamaño del modal |
| `showCloseButton` | `boolean` | `true` | Mostrar botón X de cerrar |
| `closeOnOverlayClick` | `boolean` | `true` | Cerrar al hacer clic fuera |
| `closeOnEscape` | `boolean` | `true` | Cerrar con tecla ESC |
| `className` | `string` | `''` | Clase CSS personalizada para el contenedor |
| `bodyClassName` | `string` | `''` | Clase CSS personalizada para el body |

## Tamaños Disponibles

- **small**: 400px max-width
- **medium**: 600px max-width (default)
- **large**: 900px max-width
- **fullscreen**: 95vw × 95vh

## Ejemplos de Uso

### Modal Simple con Título

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Información"
  size="small"
>
  <p>Este es un mensaje informativo.</p>
</Modal>
```

### Modal de Imagen Completa

```tsx
<Modal
  isOpen={isImageOpen}
  onClose={() => setIsImageOpen(false)}
  size="fullscreen"
  bodyClassName="modal-image-wrapper"
>
  <img src={imageUrl} alt="Imagen" className="modal-image-full" />
</Modal>
```

### Modal con Estilos Personalizados

```tsx
// En tu componente
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Guía de Talles"
  size="large"
  className="my-custom-modal"
>
  <img src={guideImage} className="my-image-style" />
</Modal>

// En tu CSS
.my-image-style {
  width: 100%;
  border-radius: 8px;
}
```

### Modal de Confirmación

```tsx
const [showConfirm, setShowConfirm] = useState(false);

const handleDelete = () => {
  // Lógica de eliminación
  setShowConfirm(false);
};

<Modal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="¿Confirmar eliminación?"
  size="small"
  closeOnOverlayClick={false}
>
  <p>Esta acción no se puede deshacer.</p>
  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
    <button onClick={() => setShowConfirm(false)}>Cancelar</button>
    <button onClick={handleDelete}>Eliminar</button>
  </div>
</Modal>
```

## Personalización de Estilos

### Opción 1: Usar className

```tsx
<Modal className="my-modal" bodyClassName="my-body">
  {/* contenido */}
</Modal>
```

```css
/* En tu archivo CSS */
.my-modal {
  background: linear-gradient(to bottom, #fff, #f5f5f5);
}

.my-body {
  padding: 40px;
}
```

### Opción 2: Estilos en línea en children

```tsx
<Modal isOpen={isOpen} onClose={onClose}>
  <div style={{ textAlign: 'center', padding: '20px' }}>
    <h3>Contenido personalizado</h3>
  </div>
</Modal>
```

## Características

✅ Portal (renderizado en body)
✅ Cierre con ESC
✅ Bloqueo de scroll
✅ Animaciones suaves
✅ Responsive
✅ Accesible
✅ Totalmente customizable

## Ver Ejemplo Completo

Revisa `src/pages/producDetail/ProductDetail.tsx` para ver ejemplos reales de uso.
