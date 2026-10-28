/**
 * Aceptación de Términos: tilde al registrarse, aviso/tilde en el pago y edición desde el panel admin.
 *
 * Pre-condición: servidor de dev corriendo en http://localhost:5173.
 * El backend y Supabase se simulan con page.route(): no se escribe nada en la base real.
 */

import { test, expect, type Page, type Route } from '@playwright/test';

const CURRENT_VERSION = '2026-10-28';
const USER = { id: '22222222-2222-4222-8222-222222222222', name: 'Cliente Prueba', email: 'buyer@example.test', role: 'user' };
const ADMIN = { id: '11111111-1111-4111-8111-111111111111', name: 'Admin', email: 'admin@example.test', role: 'admin' };
const PRODUCT = { id: 'p1', name: 'Remera Test', price: 10000, image: 'x.jpg', images: ['x.jpg'], stock: 5, variants: [] };
const PRODUCT_ROW = {
  id: 'p1', name: 'Remera Test', price: 10000, original_price: null, image_url: 'x.jpg', images: ['x.jpg'],
  discount: null, stock: 5, hover_image_enabled: true, variants: null,
};
const TERMS_REQUIRED = 'Aceptá los términos y la política de privacidad para crear tu cuenta.';

const fulfillJson = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const mockSession = async (page: Page, user: typeof USER | typeof ADMIN) => {
  await page.route('**/api/auth/refresh', (route) =>
    fulfillJson(route, 200, { data: { user, accessToken: 'tok', expiresIn: 3600 } }));
  await page.addInitScript(() => localStorage.removeItem('lia:auth-no-session'));
};

const seedCart = async (page: Page) => {
  await page.route('**/rest/v1/productos*', (route) => fulfillJson(route, 200, [PRODUCT_ROW]));
  await page.addInitScript((product) => {
    localStorage.setItem('damiana-bella-cart', JSON.stringify({
      state: { items: [{ product, quantity: 1, unitVariants: [{}] }], item: null }, version: 0, savedAt: Date.now(),
    }));
  }, PRODUCT);
};

const goToPaymentStep = async (page: Page) => {
  await page.goto('/checkout');
  await page.getByRole('button', { name: /continuar para el pago/i }).click();
  await expect(page.getByRole('heading', { name: 'Pago' })).toBeVisible();
};

test.describe('Registro', () => {
  const fillRegisterForm = async (page: Page) => {
    // El cartel de bienvenida tapa el menú en una visita nueva: se marca como ya mostrado.
    await page.addInitScript(() => sessionStorage.setItem('welcome-announcement-shown', '1'));
    await page.goto('/');
    await page.getByRole('button', { name: /iniciar sesi/i }).first().click();
    await page.getByRole('tab', { name: /crear cuenta/i }).click();
    await page.getByLabel('Nombre Completo').fill('Ana Prueba');
    await page.getByLabel('Correo Electrónico').fill('nueva@example.test');
    await page.getByLabel('Número de Celular').fill('1155551234');
    await page.locator('#registerPassword').fill('Clave1234!x');
    await page.locator('#registerConfirmPassword').fill('Clave1234!x');
  };

  test('sin tildar los términos no se crea la cuenta; tildándolos viaja la versión y queda la constancia', async ({ page }) => {
    const signups: Array<{ data: Record<string, string> }> = [];
    const registrations: unknown[] = [];
    await page.route('**/auth/v1/signup*', (route) => {
      signups.push(JSON.parse(route.request().postData() ?? '{}'));
      return fulfillJson(route, 200, { id: 'u1', email: 'nueva@example.test', identities: [{ id: 'i' }], user_metadata: {} });
    });
    await page.route('**/api/terms/registration', (route) => {
      registrations.push(JSON.parse(route.request().postData() ?? '{}'));
      return route.fulfill({ status: 204 });
    });

    await fillRegisterForm(page);
    await page.getByRole('button', { name: 'Registrarse' }).click();
    await expect(page.getByText(TERMS_REQUIRED)).toBeVisible();
    expect(signups).toHaveLength(0);

    await page.locator('#registerTerms').check();
    await expect(page.getByText(TERMS_REQUIRED)).toBeHidden();
    await page.getByRole('button', { name: 'Registrarse' }).click();
    await expect(page.getByText(/revisa tu correo/i)).toBeVisible();

    expect(signups).toHaveLength(1);
    expect(signups[0].data.terms_version).toBe(CURRENT_VERSION);
    expect(signups[0].data.terms_accepted_at).toBeTruthy();
    expect(registrations).toEqual([{ email: 'nueva@example.test', termsVersion: CURRENT_VERSION }]);
  });
});

test.describe('Pago', () => {
  test('cuenta sin aceptar: pide el tilde, lo registra y recién después crea el pedido', async ({ page }) => {
    const calls: string[] = [];
    await mockSession(page, USER);
    await seedCart(page);
    await page.route('**/api/terms/status', (route) =>
      fulfillJson(route, 200, { success: true, currentVersion: CURRENT_VERSION, accepted: false }));
    await page.route('**/api/terms/accept', (route) => {
      calls.push(`accept ${route.request().postData()}`);
      return fulfillJson(route, 201, { success: true, accepted: true });
    });
    await page.route('**/api/orders/transfer', (route) => {
      calls.push('transfer');
      return fulfillJson(route, 201, { success: true, order_ids: ['o1'], order_number: 5 });
    });

    await goToPaymentStep(page);
    await page.getByText('Transferencia por alias').click();
    const cta = page.locator('.checkout-step__actions button').first();
    await expect(cta).toBeDisabled();
    await expect(page.getByText('Aceptá los términos y condiciones para continuar.')).toBeVisible();

    await page.getByRole('checkbox', { name: /acepto los términos y condiciones \(versión/i }).check();
    await expect(cta).toBeEnabled();
    await cta.click();

    await expect.poll(() => calls.length).toBe(2);
    expect(calls[0]).toBe(`accept {"termsVersion":"${CURRENT_VERSION}"}`);
    expect(calls[1]).toBe('transfer');
  });

  test('cuenta que ya aceptó: aviso fijo con la versión, sin tilde, y no vuelve a registrar', async ({ page }) => {
    let accepts = 0;
    await mockSession(page, USER);
    await seedCart(page);
    await page.route('**/api/terms/status', (route) =>
      fulfillJson(route, 200, { success: true, currentVersion: CURRENT_VERSION, accepted: true }));
    await page.route('**/api/terms/accept', (route) => { accepts += 1; return fulfillJson(route, 201, {}); });
    await page.route('**/api/orders/transfer', (route) => fulfillJson(route, 201, { success: true, order_ids: ['o1'] }));

    await goToPaymentStep(page);
    await page.getByText('Transferencia por alias').click();
    await expect(page.getByText(`Al pagar aceptás los Términos y condiciones (versión ${CURRENT_VERSION})`)).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(0);

    const cta = page.locator('.checkout-step__actions button').first();
    await expect(cta).toBeEnabled();
    await cta.click();
    await expect(page.getByText(/pedido/i).first()).toBeVisible();
    expect(accepts).toBe(0);
  });

  test('si los términos cambiaron mientras tanto: avisa, pide aceptar de nuevo y no crea el pedido', async ({ page }) => {
    let orders = 0;
    await mockSession(page, USER);
    await seedCart(page);
    await page.route('**/api/terms/status', (route) =>
      fulfillJson(route, 200, { success: true, currentVersion: CURRENT_VERSION, accepted: false }));
    await page.route('**/api/terms/accept', (route) =>
      fulfillJson(route, 409, { success: false, code: 'TERMS_VERSION_OUTDATED', message: 'cambiaron', currentVersion: '2026-11-02' }));
    await page.route('**/api/orders/transfer', (route) => { orders += 1; return fulfillJson(route, 201, {}); });

    await goToPaymentStep(page);
    await page.getByText('Transferencia por alias').click();
    await page.getByRole('checkbox').check();
    await page.locator('.checkout-step__actions button').first().click();

    await expect(page.getByRole('alert')).toContainText('cambiaron');
    await expect(page.getByRole('checkbox', { name: /versión 2026-11-02/ })).not.toBeChecked();
    expect(orders).toBe(0);
  });
});

test.describe('Texto publicado', () => {
  test('/terminos muestra lo que publicó el admin y solo enlaza destinos seguros', async ({ page }) => {
    await page.route('**/rest/v1/site_content*', (route) => {
      if (!route.request().url().includes('legal_terms')) return route.continue();
      return fulfillJson(route, 200, {
        value: {
          version: '2026-12-01',
          body: '## Cláusula de prueba\n\nVer [Privacidad](/privacidad), [afuera](https://example.com) y [malo](javascript:alert(1)).\n\n- uno\n- dos',
        },
        updated_at: '2026-12-01T10:00:00Z',
      });
    });
    await page.goto('/terminos');

    await expect(page.getByRole('heading', { level: 2, name: 'Cláusula de prueba' })).toBeVisible();
    await expect(page.getByText('Versión 2026-12-01')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: /^(uno|dos)$/ })).toHaveCount(2);
    const hrefs = await page.locator('.legal-card a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(hrefs).toEqual(['/privacidad', 'https://example.com']);
  });
});

test.describe('Admin: Términos y condiciones', () => {
  test('publica una corrección sin cambiar la versión y un cambio importante con versión nueva', async ({ page }) => {
    const writes: Array<{ key: string; value: { version: string; body: string } }> = [];
    await mockSession(page, ADMIN);
    await page.route('**/rest/v1/site_content*', (route) => {
      const request = route.request();
      if (request.method() === 'GET' && request.url().includes('legal_terms')) {
        return fulfillJson(route, 200, { value: { version: CURRENT_VERSION, body: '## Uno\n\nTexto original.' }, updated_at: '2026-10-28T10:00:00Z' });
      }
      if (request.method() !== 'GET') {
        writes.push(JSON.parse(request.postData() ?? '{}'));
        return fulfillJson(route, 201, []);
      }
      return route.continue();
    });

    await page.goto('/admin/terminos');
    const publish = page.getByRole('button', { name: /publicar/i });
    await expect(publish).toBeDisabled();

    const textarea = page.getByRole('textbox', { name: /^Texto/ });
    await textarea.fill('## Uno\n\nTexto corregido.');
    await publish.click();
    await expect(page.getByText('¡Publicado!')).toBeVisible();

    await textarea.fill('## Uno\n\nCambio importante.');
    await page.getByRole('checkbox', { name: /cambio importante/i }).check();
    await publish.click();
    await expect.poll(() => writes.length).toBe(2);

    expect(writes[0].value.version).toBe(CURRENT_VERSION);
    expect(writes[0].value.body).toBe('## Uno\n\nTexto corregido.');
    expect(writes[1].key).toBe('legal_terms');
    expect(writes[1].value.version).not.toBe(CURRENT_VERSION);
    expect(writes[1].value.version).toMatch(/^\d{4}-\d{2}-\d{2}(\.\d+)?$/);
  });

  test('el ítem del menú lateral lleva a la pantalla', async ({ page }) => {
    await mockSession(page, ADMIN);
    await page.goto('/admin');
    await page.getByRole('link', { name: 'Términos y condiciones' }).click();
    await expect(page).toHaveURL(/\/admin\/terminos$/);
  });
});
