# Changelog

Todas las modificaciones notables se documentan en este archivo.
El formato sigue [Keep a Changelog](https://keepachangelog.com) y el proyecto adhiere a [SemVer](https://semver.org).

## [Unreleased]

### Added
- `confirmMpPayment` en `orderService` + llamada desde `CheckoutResult`: al volver
  de Mercado Pago con pago aprobado, el front llama a `POST /api/orders/mp-confirm`
  para que el backend verifique el pago contra MP y marque la venta como `pagado`.
- `extractCloudinaryPublicId` en `utils/cloudinary.ts`: deriva el `public_id`
  real (con carpeta, sin versión ni extensión) desde una URL de Cloudinary.

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
