# Navigation Loading System

Sistema global de indicador de carga para navegación entre secciones de la aplicación.

## Descripción

El `NavigationLoadProvider` detecta cambios de ruta y muestra un indicador visual centrado en pantalla mientras se carga la nueva sección. El sistema está diseñado para:

- ✅ Mostrar carga inmediatamente cuando se detecta cambio de ruta
- ✅ Evitar parpadeos innecesarios en cargas rápidas (mínimo 300ms de visibilidad)
- ✅ Funcionar globalmente sin necesidad de configuración por componente
- ✅ Aplicarse tanto a navegación desde Navbar como desde Sidebar
- ✅ Respetar preferencias de movimiento reducido (`prefers-reduced-motion`)

## Componentes

### NavigationLoadProvider
**Ubicación:** `NavigationLoadProvider.tsx`

Context provider que:
- Detecta cambios de ruta usando `useLocation` de React Router
- Gestiona el estado del loading de navegación
- Mantiene un tiempo mínimo de visibilidad para evitar parpadeos
- Renderiza `NavigationLoadingScreen` cuando `isNavigationLoading` es `true`

**Propiedades de configuración:**
```typescript
const NAVIGATION_MIN_SCREEN_TIME_MS = 300; // Tiempo mínimo visible
```

### NavigationLoadingScreen
**Ubicación:** `NavigationLoadingScreen.tsx`

Componente visual que muestra:
- Ícono de ropa (`GiClothes` de react-icons)
- Spinner animado alrededor del ícono
- Texto "Cargando..."
- Centrado en pantalla con backdrop blur

**Animaciones:**
- **Icon Float:** Movimiento vertical sutil (0 → -4px → 0)
- **Spinner Rotate:** Rotación continua del spinner
- **Fade In:** Fade de entrada al mostrar (200ms)

### CSS Styles
**Ubicación:** `NavigationLoadingScreen.css`

Estilos optimizados:
- Z-index 3999 (debajo del InitialLoadingScreen en 4000)
- Fondo semi-transparente con blur
- Animaciones fluidas
- Responsive para móvil
- Respeto a `prefers-reduced-motion`

## Integración

### En AppRouter.tsx
```tsx
import { NavigationLoadProvider } from '../components/common/NavigationLoad/NavigationLoadProvider';

const AppRouter = () => {
  return (
    <NavigationLoadProvider>
      {/* Routes */}
    </NavigationLoadProvider>
  );
};
```

### Uso en componentes
No requiere configuración especial. El loading se muestra automáticamente al cambiar de ruta:

```tsx
// El loading se mostrará automáticamente al hacer clic en estos links:

// En NavBar:
<Link to="/products" className="nav-link">Productos</Link>

// En AdminSidebar:
<NavLink to="/admin/products">Productos</NavLink>
```

## Comportamiento

1. **Usuario hace clic en link** → Ruta cambia
2. **NavigationLoadProvider detecta cambio** → `isNavigationLoading = true`
3. **Pantalla de carga aparece** con animación fade-in
4. **Espera mínimo 300ms** (evita parpadeos en cargas rápidas)
5. **Contenido nuevo carga** → React renderiza nueva página
6. **Después de mínimo de tiempo** → Loading se oculta con fade-out
7. **Usuario ve nueva sección** sin parpadeos

## Timing

```
t=0ms     | Usuario hace clic
t=0ms     | Loading visible
t=200ms   | Fade-in completo
t=300ms   | Mínimo de visibilidad alcanzado
t=300ms+  | Loading se oculta si contenido está listo
t=400ms+  | Pantalla limpia, nuevo contenido visible
```

## Personalizaciones

### Cambiar tiempo mínimo de visibilidad
En `NavigationLoadProvider.tsx`:
```typescript
const NAVIGATION_MIN_SCREEN_TIME_MS = 300; // Cambiar este valor
```

### Cambiar ícono
En `NavigationLoadingScreen.tsx`:
```tsx
// Cambiar de GiClothes a otro ícono:
import { GiDress } from 'react-icons/gi'; // o cualquier otro

<GiDress className="navigation-loading-screen__icon" />
```

### Cambiar texto
En `NavigationLoadingScreen.tsx`:
```tsx
<p className="navigation-loading-screen__text">Tu texto aquí</p>
```

## Consideraciones de performance

- **Z-index optimizado:** 3999 (debajo del InitialLoadingScreen)
- **Fixed positioning:** No afecta layout flow
- **GPU-accelerated animations:** `transform` en lugar de `top/left`
- **Minimal repaints:** Solo cambia visibilidad, no estructura DOM
- **Backdrop filter:** Blur ligero para no degradar performance

## Accesibilidad

```tsx
<div
  className="navigation-loading-screen"
  role="status"
  aria-live="polite"
  aria-label="Cargando nueva sección"
>
```

- `role="status"`: Indica que es un mensaje de estado
- `aria-live="polite"`: Los lectores de pantalla anunciarán cambios
- `aria-label`: Descripción clara del propósito

## Testing

Para verificar el funcionamiento:

1. Abre la aplicación en `http://localhost:5173`
2. Haz clic en un link del Navbar
3. Deberías ver la pantalla de carga por ~300ms
4. Luego la nueva sección carga

En cargas muy rápidas (< 300ms), el loading seguirá visible el tiempo mínimo para evitar parpadeos.

## Browser Support

- Chrome/Edge: ✅ Completo
- Firefox: ✅ Completo
- Safari: ✅ Completo (con backdrop-filter)
- Mobile browsers: ✅ Completo (responsive)
