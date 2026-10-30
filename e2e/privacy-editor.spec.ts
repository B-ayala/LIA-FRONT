/**
 * Política de privacidad editable: página pública y edición desde Admin → Política de privacidad.
 *
 * Pre-condición: servidor de dev corriendo en http://localhost:5173.
 * El backend y Supabase se simulan con page.route(): no se escribe nada en la base real.
 */

import { test, expect, type Page, type Route } from '@playwright/test';

const ADMIN = { id: '11111111-1111-4111-8111-111111111111', name: 'Admin', email: 'admin@example.test', role: 'admin' };
const NO_ROW_BODY = { code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'Cannot coerce' };
const AAIP_LEGEND = /Agencia de Acceso a la Información Pública/;

const fulfillJson = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const mockAdmin = async (page: Page) => {
  await page.route('**/api/auth/refresh', (route) =>
    fulfillJson(route, 200, { data: { user: ADMIN, accessToken: 'tok', expiresIn: 3600 } }));
  await page.addInitScript(() => localStorage.removeItem('lia:auth-no-session'));
};

test.describe('Página pública Política de privacidad', () => {
  test('sin texto publicado muestra el de por defecto y la leyenda de la AAIP', async ({ page }) => {
    await page.route('**/rest/v1/site_content*', (route) =>
      route.request().url().includes('legal_privacy') ? fulfillJson(route, 406, NO_ROW_BODY) : route.continue());
    await page.goto('/privacidad');

    await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Qué datos recolectamos' })).toBeVisible();
    await expect(page.getByText(AAIP_LEGEND)).toBeVisible();
  });

  test('muestra el texto del admin y mantiene la leyenda de la AAIP', async ({ page }) => {
    await page.route('**/rest/v1/site_content*', (route) =>
      route.request().url().includes('legal_privacy')
        ? fulfillJson(route, 200, { value: { body: '## Datos\n\nGuardamos lo mínimo.' }, updated_at: '2026-12-01T10:00:00Z' })
        : route.continue());
    await page.goto('/privacidad');

    await expect(page.getByRole('heading', { level: 2, name: 'Datos' })).toBeVisible();
    await expect(page.getByText('Guardamos lo mínimo.')).toBeVisible();
    await expect(page.getByText(AAIP_LEGEND)).toBeVisible();
  });
});

test.describe('Admin: editar Política de privacidad', () => {
  test('está en el menú lateral y publica sin versión ni nueva aceptación', async ({ page }) => {
    const writes: Array<{ key: string; value: { body: string; version?: string } }> = [];
    await mockAdmin(page);
    await page.route('**/rest/v1/site_content*', (route) => {
      const request = route.request();
      if (request.method() === 'GET' && request.url().includes('legal_privacy')) return fulfillJson(route, 406, NO_ROW_BODY);
      if (request.method() !== 'GET') {
        writes.push(JSON.parse(request.postData() ?? '{}'));
        return fulfillJson(route, 201, []);
      }
      return route.continue();
    });

    await page.goto('/admin');
    await page.getByRole('link', { name: 'Política de privacidad' }).click();
    await expect(page).toHaveURL(/\/admin\/privacidad$/);
    await expect(page.getByRole('checkbox')).toHaveCount(0);

    await page.getByRole('textbox', { name: /^Texto/ }).fill('## Datos\n\nGuardamos lo mínimo.');
    await page.getByRole('button', { name: /publicar/i }).click();

    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].key).toBe('legal_privacy');
    expect(writes[0].value.body).toBe('## Datos\n\nGuardamos lo mínimo.');
    expect(writes[0].value.version).toBeUndefined();
    await expect(page.getByText('¡Publicado!')).toBeVisible();
  });
});
