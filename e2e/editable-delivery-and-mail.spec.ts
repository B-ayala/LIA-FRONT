/**
 * Textos de entrega (horario de retiro, plazos de Correo) y "Qué sigue" del mail de arrepentimiento,
 * editables desde el panel.
 *
 * Pre-condición: servidor de dev corriendo en http://localhost:5173.
 * El backend y Supabase se simulan con page.route(): no se escribe nada en la base real.
 */

import { test, expect, type Page, type Route } from '@playwright/test';

const ADMIN = { id: '11111111-1111-4111-8111-111111111111', name: 'Admin', email: 'admin@example.test', role: 'admin' };
const NO_ROW_BODY = { code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'Cannot coerce' };
const USER = { id: '22222222-2222-4222-8222-222222222222', name: 'Cliente Prueba', email: 'buyer@example.test', role: 'user' };
const PRODUCT = { id: 'p1', name: 'Remera Test', price: 10000, image: 'x.jpg', images: ['x.jpg'], stock: 5, variants: [] };
const PRODUCT_ROW = {
  id: 'p1', name: 'Remera Test', price: 10000, original_price: null, image_url: 'x.jpg', images: ['x.jpg'],
  discount: null, stock: 5, hover_image_enabled: true, variants: null,
};
const FOOTER = { brandName: 'LIA', description: 'Tienda', copyright: 'LIA' };

const fulfillJson = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const mockSession = async (page: Page, user: typeof ADMIN | typeof USER) => {
  await page.route('**/api/auth/refresh', (route) =>
    fulfillJson(route, 200, { data: { user, accessToken: 'tok', expiresIn: 3600 } }));
  await page.addInitScript(() => localStorage.removeItem('lia:auth-no-session'));
};

const mockAdmin = (page: Page) => mockSession(page, ADMIN);

const mockSiteContent = (page: Page, published: Record<string, unknown>, writes: Array<{ key: string; value: Record<string, unknown> }> = []) =>
  page.route('**/rest/v1/site_content*', (route) => {
    const request = route.request();
    if (request.method() !== 'GET') {
      writes.push(JSON.parse(request.postData() ?? '{}'));
      return fulfillJson(route, 201, []);
    }
    const key = Object.keys(published).find((candidate) => request.url().includes(candidate));
    if (!key) return route.continue();
    return published[key] === null
      ? fulfillJson(route, 406, NO_ROW_BODY)
      : fulfillJson(route, 200, { value: published[key], updated_at: '2026-12-01T10:00:00Z' });
  });

test.describe('Admin: Entrega (Config. del sitio)', () => {
  test('publica el horario de retiro en shipping_info', async ({ page }) => {
    const writes: Array<{ key: string; value: Record<string, unknown> }> = [];
    await mockAdmin(page);
    await mockSiteContent(page, {
      footer: FOOTER, shipping_info: null, banner: null, welcomeModal: null, navbarStyle: null,
    }, writes);

    await page.goto('/admin/site-config');
    const hours = page.getByLabel('Horario de retiro en el local');
    await expect(hours).toHaveValue('lunes a viernes de 10 a 19 hs');
    await hours.fill('lunes a sábado de 9 a 17 hs');
    await page.getByRole('button', { name: /guardar cambios/i }).click();

    await expect.poll(() => writes.some((write) => write.key === 'shipping_info')).toBe(true);
    const shipping = writes.find((write) => write.key === 'shipping_info');
    expect(shipping?.value.pickupHours).toBe('lunes a sábado de 9 a 17 hs');
  });
});

test.describe('Checkout: entrega', () => {
  test('muestra el horario de retiro que publicó el admin', async ({ page }) => {
    await mockSession(page, USER);
    await mockSiteContent(page, { shipping_info: { pickupHours: 'martes y jueves de 14 a 18 hs' } });
    await page.route('**/rest/v1/productos*', (route) => fulfillJson(route, 200, [PRODUCT_ROW]));
    await page.addInitScript((product) => {
      sessionStorage.setItem('welcome-announcement-shown', '1');
      localStorage.setItem('damiana-bella-cart', JSON.stringify({
        state: { items: [{ product, quantity: 1, unitVariants: [{}] }], item: null }, version: 0, savedAt: Date.now(),
      }));
    }, PRODUCT);

    await page.goto('/checkout');
    await expect(page.getByText('Horario: martes y jueves de 14 a 18 hs.')).toBeVisible();
  });
});

test.describe('Admin: mail de constancia del arrepentimiento', () => {
  test('hay un botón en Arrepentimientos que lleva al editor', async ({ page }) => {
    await mockAdmin(page);
    await mockSiteContent(page, { withdrawal_followup: null });
    await page.route('**/api/withdrawals*', (route) => fulfillJson(route, 200, { success: true, data: [], total: 0 }));

    await page.goto('/admin/arrepentimientos');
    await page.getByRole('link', { name: /editar mail de constancia/i }).click();
    await expect(page).toHaveURL(/\/admin\/arrepentimientos\/mail$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Mail de constancia' })).toBeVisible();
  });

  test('publica los pasos y el plazo; no deja guardar vacío ni con más de 8 pasos', async ({ page }) => {
    const writes: Array<{ key: string; value: Record<string, unknown> }> = [];
    await mockAdmin(page);
    await mockSiteContent(page, { withdrawal_followup: null }, writes);

    await page.goto('/admin/arrepentimientos/mail');
    const steps = page.getByRole('textbox', { name: /^Qué sigue/ });
    await expect(steps).toHaveValue(/Dentro de las 24 horas/);

    await steps.fill('');
    await expect(page.getByRole('button', { name: /publicar/i })).toBeDisabled();
    await steps.fill(Array.from({ length: 9 }, (_, i) => `Paso ${i + 1}`).join('\n'));
    await expect(page.getByText('Máximo 8 pasos.')).toBeVisible();
    await expect(page.getByRole('button', { name: /publicar/i })).toBeDisabled();

    await steps.fill('Te escribimos en 48 horas.\nPodés cambiarlo por crédito.');
    await page.getByLabel('Plazo del reintegro (opcional)').fill('5 días hábiles');
    await expect(page.getByText('Plazo del reintegro: 5 días hábiles.')).toBeVisible();
    await page.getByRole('button', { name: /publicar/i }).click();

    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].key).toBe('withdrawal_followup');
    expect(writes[0].value.nextSteps).toBe('Te escribimos en 48 horas.\nPodés cambiarlo por crédito.');
    expect(writes[0].value.refundTerm).toBe('5 días hábiles');
    await expect(page.getByText('¡Publicado!')).toBeVisible();
  });
});

test.describe('Contacto: entrega', () => {
  test('muestra el texto que publicó el admin y no promete envíos por defecto', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('welcome-announcement-shown', '1'));
    await mockSiteContent(page, { shipping_info: { contactNote: 'Entregamos solo en Villa Celina.' } });
    await page.goto('/contact');
    await expect(page.getByText('Entregamos solo en Villa Celina.')).toBeVisible();
    await expect(page.getByText(/todo el país|puerta de tu casa/)).toHaveCount(0);
    await expect(page).toHaveTitle(/Contacto/);
    await expect(page.locator('meta[name="description"]').last()).toHaveAttribute('content', /retiro en nuestro local/);
  });

  test('sin texto publicado muestra el de por defecto', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('welcome-announcement-shown', '1'));
    await mockSiteContent(page, { shipping_info: null });
    await page.goto('/contact');
    await expect(page.getByText('Por ahora la entrega es con retiro en nuestro local.')).toBeVisible();
  });
});
