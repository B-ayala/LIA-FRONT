/**
 * "Cambios y devoluciones" editable: página pública con los puntos [A DEFINIR] y edición desde
 * Admin → Arrepentimientos.
 *
 * Pre-condición: servidor de dev corriendo en http://localhost:5173.
 * El backend y Supabase se simulan con page.route(): no se escribe nada en la base real.
 */

import { test, expect, type Page, type Route } from '@playwright/test';

const ADMIN = { id: '11111111-1111-4111-8111-111111111111', name: 'Admin', email: 'admin@example.test', role: 'admin' };
const EDITOR_PATH = '/admin/arrepentimientos/cambios-y-devoluciones';
const PENDING_POINTS = 6;

const fulfillJson = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const mockAdmin = async (page: Page) => {
  await page.route('**/api/auth/refresh', (route) =>
    fulfillJson(route, 200, { data: { user: ADMIN, accessToken: 'tok', expiresIn: 3600 } }));
  await page.addInitScript(() => localStorage.removeItem('lia:auth-no-session'));
};

// Sin texto publicado Supabase responde sin fila (PGRST116 en maybeSingle): rige el texto por defecto.
const NO_ROW_BODY = { code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'Cannot coerce' };

const mockNoPublishedReturns = (page: Page) =>
  page.route('**/rest/v1/site_content*', (route) => {
    if (!route.request().url().includes('legal_returns')) return route.continue();
    return fulfillJson(route, 406, NO_ROW_BODY);
  });

test.describe('Página pública Cambios y devoluciones', () => {
  test('sin texto publicado muestra el texto por defecto, con los puntos a definir y retiro en local', async ({ page }) => {
    await mockNoPublishedReturns(page);
    await page.goto('/cambios-y-devoluciones');

    await expect(page.getByRole('heading', { level: 1, name: 'Cambios y devoluciones' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Cambios' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: '¿Cuál es el plazo para pedir un cambio?' })).toBeVisible();
    await expect(page.getByText(/\[A DEFINIR/)).toHaveCount(PENDING_POINTS);
    await expect(page.getByText(/retiro en el local/i)).toBeVisible();
    await expect(page.getByText(/transporte|operador logístico|flete/i)).toHaveCount(0);
  });

  test('muestra el texto que publicó el admin', async ({ page }) => {
    await page.route('**/rest/v1/site_content*', (route) => {
      if (!route.request().url().includes('legal_returns')) return route.continue();
      return fulfillJson(route, 200, {
        value: { body: '## Plazo de cambio\n\nTenés 15 días corridos desde que retirás el pedido.' },
        updated_at: '2026-12-01T10:00:00Z',
      });
    });
    await page.goto('/cambios-y-devoluciones');

    await expect(page.getByRole('heading', { level: 2, name: 'Plazo de cambio' })).toBeVisible();
    await expect(page.getByText('Tenés 15 días corridos')).toBeVisible();
    await expect(page.getByText(/\[A DEFINIR/)).toHaveCount(0);
  });
});

test.describe('Admin: editar Cambios y devoluciones', () => {
  test('desde Arrepentimientos hay un botón que lleva al editor y se puede volver', async ({ page }) => {
    await mockAdmin(page);
    await mockNoPublishedReturns(page);
    await page.route('**/api/withdrawals*', (route) => fulfillJson(route, 200, { success: true, data: [], total: 0 }));

    await page.goto('/admin/arrepentimientos');
    await page.getByRole('link', { name: /editar cambios y devoluciones/i }).click();
    await expect(page).toHaveURL(new RegExp(`${EDITOR_PATH}$`));
    await expect(page.getByRole('heading', { level: 1, name: 'Cambios y devoluciones' })).toBeVisible();

    await page.getByRole('link', { name: /volver a arrepentimientos/i }).click();
    await expect(page).toHaveURL(/\/admin\/arrepentimientos$/);
  });

  test('avisa cuántos [A DEFINIR] quedan, y publica sin pedir nueva aceptación', async ({ page }) => {
    const writes: Array<{ key: string; value: { body: string; version?: string } }> = [];
    await mockAdmin(page);
    await page.route('**/rest/v1/site_content*', (route) => {
      const request = route.request();
      if (request.method() === 'GET' && request.url().includes('legal_returns')) {
        return fulfillJson(route, 406, NO_ROW_BODY);
      }
      if (request.method() !== 'GET') {
        writes.push(JSON.parse(request.postData() ?? '{}'));
        return fulfillJson(route, 201, []);
      }
      return route.continue();
    });

    await page.goto(EDITOR_PATH);
    await expect(page.getByText(`Quedan ${PENDING_POINTS} puntos [A DEFINIR] sin completar.`)).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /publicar/i })).toBeDisabled();

    // Con un solo punto sin completar sigue bloqueado, aunque el texto haya cambiado.
    await page.getByRole('textbox', { name: /^Texto/ }).fill('## Cambios\n\n[A DEFINIR: plazo]');
    await expect(page.getByText('Quedan 1 punto [A DEFINIR] sin completar.')).toBeVisible();
    await expect(page.getByRole('button', { name: /publicar/i })).toBeDisabled();

    await page.getByRole('textbox', { name: /^Texto/ }).fill('## Cambios\n\nTenés 15 días corridos.');
    await expect(page.getByText(/sin completar/)).toHaveCount(0);
    await page.getByRole('button', { name: /publicar/i }).click();

    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].key).toBe('legal_returns');
    expect(writes[0].value.body).toBe('## Cambios\n\nTenés 15 días corridos.');
    expect(writes[0].value.version).toBeUndefined();
    await expect(page.getByText('¡Publicado!')).toBeVisible();
  });
});
