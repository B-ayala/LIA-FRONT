# Uso del Sistema de Loading de Navegación

## 🚀 Características Implementadas

El sistema de loading de navegación ya está **completamente integrado** en tu aplicación. No requiere configuración adicional.

### ✅ Lo que hace automáticamente:

1. **Detecta cambios de ruta** — Cuando el usuario hace clic en cualquier link
2. **Muestra indicador visual** — Overlay en el área de contenido principal con ícono de ropa
3. **Mantiene navbar/sidebar visibles** — El loading solo cubre el contenido, no la navegación
4. **Previene parpadeos** — Mantiene visible por mínimo 300ms
5. **Oculta automáticamente** — Cuando el contenido nuevo está listo

## 📍 Dónde se ve el loading

### En la sección pública (Navbar)
- Clic en "Inicio" → Loading visible
- Clic en "Productos" → Loading visible
- Clic en categorías → Loading visible
- Clic en "Contacto", "Acerca de" → Loading visible

### En la sección admin (Sidebar)
- Clic en "Inicio" → Loading visible
- Clic en "Productos", "Ventas", "Despachos", etc. → Loading visible
- Cambio entre cualquier sección → Loading visible

## 🎨 Lo que verá el usuario

### Vista General (Sección Pública):
```
┌────────────────────────────────┐
│  🏠  [Inicio] [Productos] ...   │  ← NavBar SIEMPRE VISIBLE
├────────────────────────────────┤
│                                │
│   🧥 (ícono girando)           │
│  ↻                              │  ← SOLO EL CONTENIDO
│ Cargando...                    │
│                                │
└────────────────────────────────┘
```

### Vista General (Sección Admin):
```
┌──────┬──────────────────────────┐
│ Logo │ [Admin]                  │  ← Header SIEMPRE VISIBLE
├──────┼──────────────────────────┤
│      │                          │
│ Menu │  🧥 (ícono girando)      │
│ Pad  │ ↻                         │  ← SOLO EL CONTENIDO
│ ●    │ Cargando...             │
│ ●    │                          │
│ ●    │                          │
│      └──────────────────────────┘
```

### Comportamiento visual:
- **Aparece**: Fade in suave (150ms) en el área de contenido
- **Ícono**: Flota arriba-abajo (64x64px) con rotación del spinner
- **Fondo**: Blur semi-transparente blanco (70% opacidad)
- **Posición**: Centrado en el área de contenido principal
- **NavBar/Sidebar**: Permanecen siempre visibles y funcionales
- **Desaparece**: Automático después de cargar con fade-out

## ⏱️ Timeline de carga

```
t=0ms      | Usuario hace clic en "Productos"
           |
t=0ms      | ✓ Loading aparece (fade-in comienza)
           |
t=200ms    | ✓ Fade-in completo
           |
t=300ms    | ✓ Mínimo de visibilidad alcanzado
           | ✓ Contenido nuevo renderizado
           |
t=400ms    | ✓ Loading desaparece
           | ✓ Nueva página visible
```

## 🧪 Cómo probar

### Test 1: Navegación rápida
1. Abre la app en `http://localhost:5173`
2. Haz clic rápidamente en diferentes links del navbar
3. Verás el loading cada vez, pero sin parpadeos

### Test 2: Cargas lentas
1. Abre DevTools (F12)
2. Network → Throttle (marca "Slow 3G")
3. Haz clic en un link
4. Verás el loading manteniéndose visible hasta que cargue el contenido

### Test 3: Navegación en admin
1. Ve a `/admin`
2. Haz clic en diferentes items del sidebar
3. Verás el loading en cada sección

### Test 4: Mobile
1. Reduce tamaño del navegador a 768px o menos
2. El loading se adapta automáticamente
3. Prueba en viewport mobile

## 🔧 Personalización (opcional)

Si quieres cambiar algo del loading:

### Cambiar el tiempo mínimo (300ms por defecto)
**Archivo:** `NavigationLoadProvider.tsx`
```typescript
const NAVIGATION_MIN_SCREEN_TIME_MS = 300; // Cambiar este valor
```

### Cambiar el ícono
**Archivo:** `NavigationLoadingScreen.tsx`
```tsx
import { GiDress } from 'react-icons/gi'; // Cambiar a otro ícono

<GiDress className="navigation-loading-screen__icon" />
```

### Cambiar el texto
**Archivo:** `NavigationLoadingScreen.tsx`
```tsx
<p className="navigation-loading-screen__text">Tu texto aquí</p>
```

### Cambiar la velocidad de animación
**Archivo:** `NavigationLoadingScreen.css`
```css
.navigation-loading-screen__icon {
  animation: nav-loading-icon-float 1.6s ease-in-out infinite;
  /* Cambiar 1.6s a otro valor */
}

.navigation-loading-screen__spinner {
  animation: nav-loading-spin 1s linear infinite;
  /* Cambiar 1s a otro valor */
}
```

### Cambiar colores
**Archivo:** `NavigationLoadingScreen.css`
```css
.navigation-loading-screen {
  background: rgba(255, 255, 255, 0.85); /* Fondo */
}

.navigation-loading-screen__icon {
  color: #b8377d; /* Color del ícono */
}

.navigation-loading-screen__spinner {
  border-top-color: rgba(184, 55, 125, 0.3); /* Color del spinner */
}
```

## 📋 Arquitectura técnica

### Archivos principales:
- `NavigationLoadProvider.tsx` — Context + lógica de detección de rutas
- `NavigationLoadingScreen.tsx` — Componente visual
- `NavigationLoadingScreen.css` — Estilos y animaciones
- `AppRouter.tsx` — Integración (ya incluida)

### Cómo funciona:
1. `NavigationLoadProvider` detecta cambios en `useLocation()`
2. Establece `isNavigationLoading = true`
3. Renderiza `NavigationLoadingScreen`
4. Espera mínimo 300ms
5. Verifica si contenido está listo
6. Oculta loading con fade-out

### Z-index:
- InitialLoadingScreen: 4000
- NavigationLoadingScreen: 3999 (debajo)
- Header/Navbar: variable (no afectado)

## ♿ Accesibilidad

El loading es accesible:
```tsx
role="status"          // Indica estado
aria-live="polite"     // Lectores de pantalla lo leen
aria-label="..."       // Descripción clara
```

## 🚫 Casos donde NO aparece el loading

- Recarga de página (F5) — Se muestra InitialLoadingScreen en su lugar
- Rutas de autenticación (`/auth/confirm`, etc.) — Manejo especial
- Cambios de querystring sin cambiar ruta base

## 📱 Responsive

El loading se adapta automáticamente:
- **Desktop**: 80px × 80px, texto normal
- **Tablet**: 70px × 70px
- **Mobile**: 70px × 70px, ícono más pequeño

## ✨ Performance

- **GPU-accelerated**: Usa `transform` en animaciones
- **No layout shift**: Fixed positioning
- **Minimal repaints**: Solo cambia opacity/visibility
- **Backdrop filter**: Ligero blur, optimizado para performance

## 🐛 Troubleshooting

### El loading no aparece
- Verifica que `NavigationLoadProvider` envuelve `AppRouter`
- Abre console (F12) y busca errores

### El loading parpadea
- Espera 300ms mínimo — es intencional para evitar parpadeos en cargas rápidas
- Si es demasiado lento, reduce `NAVIGATION_MIN_SCREEN_TIME_MS`

### El loading aparece pero no desaparece
- Puede ser que la página tenga un error de carga
- Revisa Console (F12) para errores

## 📚 Ver también

- `README.md` — Documentación técnica completa
- `NavigationLoadProvider.tsx` — Código fuente comentado
- `NavigationLoadingScreen.tsx` — Componente visual
- `NavigationLoadingScreen.css` — Estilos y keyframes
