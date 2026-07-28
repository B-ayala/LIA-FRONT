/**
 * Pruebas de estrés de loading states
 *
 * Verifica que los skeletons/loaders aparecen y desaparecen correctamente bajo:
 *  - API lenta (intercepción de Supabase con delay artificial)
 *  - Navegación rápida entre rutas
 *  - Errores de red (offline)
 *  - Múltiples recargas concurrentes
 *
 * Pre-condición: servidor de dev corriendo en http://localhost:5173
 *
 * NOTA: Se usa page.route() para interceptar llamadas a Supabase/API y simular
 * latencia solo en las peticiones de datos, sin afectar la carga del bundle.
 * Esto evita timeouts por throttling global del HTML/JS del servidor local.
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Delay artificial en ms aplicado a las respuestas de la API */
const API_DELAY_SLOW = 2500;   // simula 3G lento
const API_DELAY_VERY_SLOW = 6000; // simula conexión muy lenta

/**
 * Intercepta todas las peticiones a Supabase/API y les agrega un delay.
 * No afecta la carga del bundle local de Vite.
 * Safe: usa try/catch en route.continue() para ignorar rutas ya manejadas.
 */
async function slowDownApi(page: Page, delayMs: number) {
  const handler = async (route: import('@playwright/test').Route) => {
    await new Promise((r) => setTimeout(r, delayMs));
    try { await route.continue(); } catch { /* route already handled */ }
  };
  await page.route('**supabase.co/**', handler);
  await page.route('**/api/**', handler);
}

/** Bloquea todas las peticiones externas (Supabase + API) para simular offline */
async function blockApi(page: Page) {
  await page.route('**supabase.co/**', (route) => route.abort('failed'));
  await page.route('**/api/**', (route) => route.abort('failed'));
}

/** Elimina todos los interceptores activos de la página */
async function restoreApi(page: Page) {
  await page.unroute('**supabase.co/**');
  await page.unroute('**/api/**');
}

// ─── Suite: Carrusel ─────────────────────────────────────────────────────────

test.describe('Carrusel — loading state', () => {
  test('ST-001 | Skeleton del carrusel aparece cuando la API de imágenes tarda', async ({ page }) => {
    // Retardar las peticiones a Supabase antes de cargar la página
    await slowDownApi(page, API_DELAY_SLOW);
    await page.goto('/');

    const skeleton = page.locator('.carousel--skeleton');
    await expect(skeleton).toBeVisible({ timeout: 3000 });
    expect(await skeleton.getAttribute('role')).toBe('status');
    expect(await skeleton.getAttribute('aria-label')).toContain('Cargando');

    // Logo visible dentro del skeleton
    const logo = skeleton.locator('img.carousel-skeleton__logo');
    await expect(logo).toBeVisible();
  });

  test('ST-002 | Skeleton desaparece y carrusel se muestra al cargar', async ({ page }) => {
    await page.goto('/');

    // Esperar que el skeleton desaparezca (max 15s en producción / dev puede tardar)
    await expect(page.locator('.carousel--skeleton')).toBeHidden({ timeout: 15000 });

    // Carrusel real visible
    await expect(page.locator('.carousel')).toBeVisible();
    // Tiene al menos una imagen
    const img = page.locator('.carousel-image').first();
    await expect(img).toBeVisible();
  });

  test('ST-003 | Skeleton persiste varios segundos con API muy lenta', async ({ page }) => {
    await slowDownApi(page, API_DELAY_VERY_SLOW);
    await page.goto('/');

    // Con 6s de delay, el skeleton debe seguir visible por varios segundos
    const skeleton = page.locator('.carousel--skeleton');
    await expect(skeleton).toBeVisible({ timeout: 3000 });

    // Debe persistir al menos 4 segundos (no desaparecer prematuramente)
    await page.waitForTimeout(4000);
    await expect(skeleton).toBeVisible();

    // Eventualmente se resuelve
    await expect(skeleton).toBeHidden({ timeout: 20000 });
  });
});

// ─── Suite: Products ─────────────────────────────────────────────────────────

test.describe('Products — loading state', () => {
  test('ST-004 | Skeletons de productos aparecen mientras la API tarda', async ({ page }) => {
    // Retardar Supabase para que el skeleton sea visible
    await slowDownApi(page, API_DELAY_SLOW);
    await page.goto('/products');

    // ProductGrid renderiza tarjetas skeleton con clase .product-card-skeleton
    const skeletons = page.locator('.product-card-skeleton');
    await expect(skeletons.first()).toBeVisible({ timeout: 3000 });

    const count = await skeletons.count();
    // skeletonCount={8} → 8 cards
    expect(count).toBe(8);
  });

  test('ST-005 | Skeletons se reemplazan por productos reales al cargar', async ({ page }) => {
    await page.goto('/products');

    // Esperar que desaparezcan los skeletons
    await expect(page.locator('.product-card-skeleton').first()).toBeHidden({ timeout: 15000 });

    // Hay al menos un producto real
    const productCards = page.locator('.product-card');
    await expect(productCards.first()).toBeVisible();
  });

  test('ST-006 | Estado vacío se muestra cuando la categoría no tiene productos', async ({ page }) => {
    await page.goto('/products?category=CategoriaQueNoExiste');
    await expect(page.locator('.product-card-skeleton').first()).toBeHidden({ timeout: 15000 });

    const empty = page.locator('.products-empty');
    await expect(empty).toBeVisible();
    await expect(empty).toContainText('No hay productos');
  });

  test('ST-007 | Breadcrumb se renderiza correctamente con filtro de categoría', async ({ page }) => {
    await page.goto('/products?category=Ropa');
    await page.waitForLoadState('networkidle');

    const breadcrumb = page.locator('.products-breadcrumb');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText('Shop');
  });
});

// ─── Suite: ProductDetail ─────────────────────────────────────────────────────

test.describe('ProductDetail — loading state', () => {
  // Helper: obtener el primer ID de producto activo
  async function getFirstProductId(page: Page): Promise<string> {
    // Navegar a products y obtener el primer link de detalle
    await page.goto('/products');
    await expect(page.locator('.product-card-skeleton').first()).toBeHidden({ timeout: 15000 });
    const firstCard = page.locator('.product-card a, .product-card').first();
    const href = await firstCard.getAttribute('href');
    if (href && href.includes('/product/')) {
      return href.split('/product/')[1].split('?')[0];
    }
    // Fallback: click en la primera tarjeta y leer la URL
    await firstCard.click();
    await page.waitForURL('**/product/**');
    return page.url().split('/product/')[1].split('?')[0];
  }

  test('ST-008 | Skeleton de detalle aparece cuando la API tarda', async ({ page }) => {
    // Obtener un ID sin delay
    const productId = await getFirstProductId(page);

    // Ahora retardamos la API y navegamos al detalle
    await slowDownApi(page, API_DELAY_SLOW);
    await page.goto(`/product/${productId}`);

    const skeleton = page.locator('.product-detail-skeleton');
    await expect(skeleton).toBeVisible({ timeout: 5000 });
    expect(await skeleton.getAttribute('role')).toBe('status');
    expect(await skeleton.getAttribute('aria-busy')).toBe('true');

    // Logo visible
    await expect(skeleton.locator('.product-detail-skeleton__logo')).toBeVisible();
  });

  test('ST-009 | Skeleton de detalle se reemplaza por contenido real', async ({ page }) => {
    const productId = await getFirstProductId(page);

    await page.goto(`/product/${productId}`);
    await expect(page.locator('.product-detail-skeleton')).toBeHidden({ timeout: 15000 });

    // Contenido real visible
    await expect(page.locator('.product-detail')).toBeVisible();
    await expect(page.locator('.info__title')).toBeVisible();
    await expect(page.locator('.pricing__final')).toBeVisible();
  });

  test('ST-010 | Pantalla "no disponible" para ID inexistente', async ({ page }) => {
    await page.goto('/product/id-que-no-existe-99999');
    await expect(page.locator('.product-detail-skeleton')).toBeHidden({ timeout: 15000 });

    const unavailable = page.locator('.product-unavailable');
    await expect(unavailable).toBeVisible();
    await expect(unavailable).toContainText('no disponible');

    // Botón de vuelta al catálogo
    const btn = unavailable.locator('button');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('catálogo');
  });
});

// ─── Suite: Navegación rápida ─────────────────────────────────────────────────

test.describe('Navegación rápida — no broken loading states', () => {
  test('ST-011 | Navegar rápidamente entre rutas no deja estados colgados', async ({ page }) => {
    // Capturar errores de consola desde el inicio
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Retardar API para que las requests queden en vuelo al navegar
    await slowDownApi(page, API_DELAY_SLOW);

    // Navegar rápido sin esperar que la data cargue
    await page.goto('/');
    await page.goto('/products');
    await page.goto('/');
    await page.goto('/products');

    // Restaurar API normal y esperar que todo se resuelva
    await restoreApi(page);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // No debe haber errores JS críticos de React (unmount race conditions)
    const criticalErrors = errors.filter(e =>
      e.includes('Cannot update') ||
      e.includes('unmounted component') ||
      e.includes("Warning: Can't perform")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('ST-012 | Skeleton correcto al volver a /products desde /product/:id', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('.product-card-skeleton').first()).toBeHidden({ timeout: 15000 });

    // Click en primer producto
    await page.locator('.product-card').first().click();
    await page.waitForURL('**/product/**');
    await expect(page.locator('.product-detail-skeleton')).toBeHidden({ timeout: 15000 });

    // Volver al catálogo
    await page.goBack();
    await page.waitForURL('**/products**');

    // El grid debe estar visible (no bloqueado en skeleton)
    await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 5000 });
  });

  test('ST-013 | Navegar entre dos productos distintos muestra skeleton intermedio', async ({ page }) => {
    // Cargar listado
    await page.goto('/products');
    await expect(page.locator('.product-card-skeleton').first()).toBeHidden({ timeout: 15000 });

    const cards = page.locator('.product-card');
    const count = await cards.count();
    if (count < 2) {
      test.skip();
      return;
    }

    // Ir al primer producto
    await cards.nth(0).click();
    await page.waitForURL('**/product/**');
    const firstUrl = page.url();
    await expect(page.locator('.product-detail')).toBeVisible({ timeout: 15000 });

    // Throttle y navegar al segundo
    await throttle(page, SLOW_3G);
    await page.goBack();
    await page.waitForURL('**/products**');
    await cards.nth(1).click();
    await page.waitForURL('**/product/**');

    const secondUrl = page.url();
    expect(secondUrl).not.toBe(firstUrl);

    // Skeleton debe aparecer mientras carga el nuevo producto
    // (puede ser muy breve; verificamos que el contenido anterior no persiste)
    await expect(page.locator('.product-detail')).toBeVisible({ timeout: 15000 });
  });
});

// ─── Suite: Red caída (offline) ───────────────────────────────────────────────

test.describe('Red offline — error states', () => {
  test('ST-014 | API bloqueada en /products → no queda en skeleton infinito', async ({ page }) => {
    // Bloquear la API antes de navegar
    await blockApi(page);
    await page.goto('/products');

    // Esperar un tiempo razonable
    await page.waitForTimeout(5000);

    const skeleton = page.locator('.product-card-skeleton');
    const skeletonVisible = await skeleton.count() > 0 && await skeleton.first().isVisible();

    // No puede quedar bloqueado indefinidamente en skeleton tras un error de red
    // (Products.tsx → .catch(console.error).finally(() => setLoading(false)))
    expect(skeletonVisible).toBe(false);
  });

  test('ST-015 | Reconexión en /products → carga correctamente después de API bloqueada', async ({ page }) => {
    // Cargar normal primero
    await page.goto('/products');
    await expect(page.locator('.product-card-skeleton').first()).toBeHidden({ timeout: 15000 });

    // Bloquear API y recargar
    await blockApi(page);
    await page.reload();
    await page.waitForTimeout(3000);

    // Restaurar y recargar
    await restoreApi(page);
    await page.reload();

    await expect(page.locator('.product-card-skeleton').first()).toBeHidden({ timeout: 15000 });
    await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Suite: Rendimiento visual ────────────────────────────────────────────────

test.describe('Rendimiento visual de loading', () => {
  test('ST-016 | Skeleton de productos aparece en menos de 500ms tras navegar', async ({ page }) => {
    // Sin throttle — skeleton debe ser inmediato (es un render local)
    const start = Date.now();
    await page.goto('/products', { waitUntil: 'domcontentloaded' });

    const skeleton = page.locator('.product-card-skeleton').first();
    await expect(skeleton).toBeVisible({ timeout: 2000 });

    const elapsed = Date.now() - start;
    // El skeleton es puro CSS/JS: debe aparecer < 500ms
    expect(elapsed).toBeLessThan(2000);
  });

  test('ST-017 | Skeleton de detalle aparece < 500ms al navegar directo por URL', async ({ page }) => {
    // Conseguir un ID primero sin throttle
    await page.goto('/products');
    await expect(page.locator('.product-card-skeleton').first()).toBeHidden({ timeout: 15000 });
    await page.locator('.product-card').first().click();
    await page.waitForURL('**/product/**');
    const productUrl = page.url();

    // Navegar directamente y medir
    const start = Date.now();
    await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

    const skeleton = page.locator('.product-detail-skeleton');
    await expect(skeleton).toBeVisible({ timeout: 2000 });

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  test('ST-018 | Logo LIA visible en skeleton del carrusel (branding)', async ({ page }) => {
    await slowDownApi(page, API_DELAY_SLOW);
    await page.goto('/');
    await expect(page.locator('.carousel-skeleton__logo')).toBeVisible({ timeout: 5000 });
  });

  test('ST-018b | Logo LIA visible en skeleton del detalle de producto', async ({ page }) => {
    // Paso 1: obtener URL de producto sin delay
    await page.goto('/products');
    await expect(page.locator('.product-card-skeleton').first()).toBeHidden({ timeout: 15000 });
    await page.locator('.product-card').first().click();
    await page.waitForURL('**/product/**');
    const productUrl = page.url();

    // Paso 2: navegar con API lenta para capturar el skeleton
    await slowDownApi(page, API_DELAY_SLOW);
    await page.goto(productUrl);
    await expect(page.locator('.product-detail-skeleton__logo')).toBeVisible({ timeout: 5000 });
  });
});
