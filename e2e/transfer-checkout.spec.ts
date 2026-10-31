/**
 * Precio con transferencia en el checkout: al elegir "Transferencia por alias" se aplica el
 * `transfer_price` publicado en la card, el resumen muestra el descuento y el pedido viaja con ese
 * total. Si el backend detecta que el precio cambió (409 PRICE_CHANGED) se avisa y se recargan precios.
 *
 * Pre-condición: servidor de dev corriendo en http://localhost:5173.
 * El backend y Supabase se simulan con page.route(): no se escribe nada en la base real.
 */

import { test, expect, type Page, type Route } from '@playwright/test';

const USER = { id: '22222222-2222-4222-8222-222222222222', name: 'Cliente Prueba', email: 'buyer@example.test', role: 'user' };
const LIST_PRICE = 71500;
const TRANSFER_PRICE = 64350;
const PRODUCT = {
  id: 'p1', name: 'Sandalia Test', price: LIST_PRICE, transferPrice: TRANSFER_PRICE,
  image: 'x.jpg', images: ['x.jpg'], stock: 5, variants: [],
};
const PRODUCT_ROW = {
  id: 'p1', name: 'Sandalia Test', price: LIST_PRICE, original_price: null, transfer_price: TRANSFER_PRICE,
  image_url: 'x.jpg', images: ['x.jpg'], discount: null, stock: 5, hover_image_enabled: true, variants: null,
};

const fulfillJson = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const mockSession = async (page: Page) => {
  await page.route('**/api/auth/refresh', (route) =>
    fulfillJson(route, 200, { data: { user: USER, accessToken: 'tok', expiresIn: 3600 } }));
  await page.route('**/api/terms/status', (route) =>
    fulfillJson(route, 200, { success: true, currentVersion: '2026-10-28', accepted: true }));
  await page.addInitScript(() => localStorage.removeItem('lia:auth-no-session'));
};

/** Carrito con 2 unidades; devuelve cuántas veces se pidieron los precios frescos. */
const seedCart = async (page: Page, row: Record<string, unknown> = PRODUCT_ROW) => {
  const fetches = { count: 0 };
  await page.route('**/rest/v1/productos*', (route) => {
    fetches.count += 1;
    return fulfillJson(route, 200, [row]);
  });
  await page.addInitScript((product) => {
    localStorage.setItem('damiana-bella-cart', JSON.stringify({
      state: { items: [{ product, quantity: 2, unitVariants: [{}, {}] }], item: null }, version: 0, savedAt: Date.now(),
    }));
  }, PRODUCT);
  return fetches;
};

const goToPaymentStep = async (page: Page) => {
  await page.goto('/checkout');
  await page.getByRole('button', { name: /continuar para el pago/i }).click();
  await expect(page.getByRole('heading', { name: 'Pago' })).toBeVisible();
};

/** En mobile el resumen arranca colapsado: se abre para poder leer las filas. */
const summary = async (page: Page) => {
  const toggle = page.getByRole('button', { name: 'Ver resumen' });
  if (await toggle.isVisible()) await toggle.click();
  return page.locator('.order-summary__totals');
};

const chooseTransfer = (page: Page) => page.getByText('Transferencia por alias').click();
const chooseMp = (page: Page) => page.getByText('Pagar con Mercado Pago').click();

test.describe('Precio con transferencia en el checkout', () => {
  test('elegir transferencia aplica el descuento en el resumen y el pedido viaja con ese total', async ({ page }) => {
    const sent: Array<Record<string, unknown>> = [];
    await mockSession(page);
    await seedCart(page);
    await page.route('**/api/orders/transfer', (route) => {
      sent.push(JSON.parse(route.request().postData() ?? '{}'));
      return fulfillJson(route, 201, { success: true, order_ids: ['o1'], order_number: 1001 });
    });

    await goToPaymentStep(page);
    await expect(page.locator('.checkout-step__savings')).toHaveText('Ahorrás $14.300,00');

    const totals = await summary(page);
    await expect(totals.getByText('Descuento por transferencia')).toHaveCount(0);
    await expect(totals.locator('.order-summary__row--total .sr-only')).toHaveText('$143.000,00');

    await chooseTransfer(page);
    await expect(totals.getByText('Descuento por transferencia')).toBeVisible();
    await expect(totals.locator('.order-summary__row--discount .sr-only').last()).toHaveText('$14.300,00');
    await expect(totals.locator('.order-summary__row--total .sr-only')).toHaveText('$128.700,00');
    await expect(page.locator('.checkout-step__transfer-amount')).toContainText('Total a transferir');
    await expect(page.getByRole('status').filter({ hasText: 'Descuento por transferencia aplicado' })).toHaveCount(1);

    await page.locator('.checkout-step__actions button').first().click();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0].totalPrice).toBe(128700);
  });

  test('volver a Mercado Pago quita el descuento y el total vuelve al precio de lista', async ({ page }) => {
    await mockSession(page);
    await seedCart(page);
    await goToPaymentStep(page);
    const totals = await summary(page);

    await chooseTransfer(page);
    await expect(totals.getByText('Descuento por transferencia')).toBeVisible();
    await chooseMp(page);
    await expect(totals.getByText('Descuento por transferencia')).toHaveCount(0);
    await expect(totals.locator('.order-summary__row--total .sr-only')).toHaveText('$143.000,00');
    await expect(page.locator('.checkout-step__transfer-amount')).toHaveCount(0);
  });

  test('un producto sin precio de transferencia no muestra ahorro ni descuento', async ({ page }) => {
    await mockSession(page);
    await seedCart(page, { ...PRODUCT_ROW, transfer_price: null });
    await goToPaymentStep(page);
    await expect(page.locator('.checkout-step__savings')).toHaveCount(0);

    await chooseTransfer(page);
    const totals = await summary(page);
    await expect(totals.getByText('Descuento por transferencia')).toHaveCount(0);
    await expect(totals.locator('.order-summary__row--total .sr-only')).toHaveText('$143.000,00');
  });

  test.describe('Pedido creado: copiar alias y monto', () => {
    const createTransferOrder = async (page: Page) => {
      await mockSession(page);
      await seedCart(page);
      await page.route('**/api/orders/transfer', (route) =>
        fulfillJson(route, 201, { success: true, order_ids: ['o1'], order_number: 1001 }));
      // La ventana de WhatsApp no aporta a esta prueba: se corta para no salir a internet.
      await page.route('https://wa.me/**', (route) => route.abort());
      await goToPaymentStep(page);
      await chooseTransfer(page);
      await page.locator('.checkout-step__actions button').first().click();
      await expect(page.getByText('Pedido creado')).toBeVisible();
    };

    const field = (page: Page, label: string) => page.locator('.copy-field').filter({ hasText: label });

    test('copia el alias y el monto listo para pegar en el banco', async ({ page, context, browserName }) => {
      test.skip(browserName !== 'chromium', 'leer el portapapeles en la prueba requiere permisos de Chromium');
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await createTransferOrder(page);

      await expect(field(page, 'Alias')).toContainText('Liazapatos');
      await expect(field(page, 'Monto a transferir')).toContainText('$128.700,00');

      await field(page, 'Alias').getByRole('button').click();
      await expect(field(page, 'Alias').getByRole('button')).toHaveText('Copiado');
      await expect(page.getByRole('status').filter({ hasText: 'Alias copiado' })).toHaveCount(1);
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Liazapatos');

      await field(page, 'Monto a transferir').getByRole('button').click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('128700');
      await expect(field(page, 'Alias').getByRole('button')).toHaveText('Copiar', { timeout: 4000 });
    });

    test('sin permiso de portapapeles avisa y deja el dato seleccionado para copiarlo a mano', async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: () => Promise.reject(new Error('denied')) },
        });
      });
      await createTransferOrder(page);

      await field(page, 'Monto a transferir').getByRole('button').click();
      await expect(field(page, 'Monto a transferir').getByRole('button')).toHaveText('Copialo a mano');
      expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('$128.700,00');
    });
  });

  test('si el precio cambió (409 PRICE_CHANGED) avisa y vuelve a pedir los precios', async ({ page }) => {
    await mockSession(page);
    const fetches = await seedCart(page);
    await page.route('**/api/orders/transfer', (route) => fulfillJson(route, 409, {
      success: false,
      code: 'PRICE_CHANGED',
      message: 'El precio de tu pedido cambió. Revisá el nuevo total antes de confirmar.',
      expectedTotal: 130000,
    }));

    await goToPaymentStep(page);
    await chooseTransfer(page);
    const before = fetches.count;
    await page.locator('.checkout-step__actions button').first().click();

    await expect(page.getByRole('alert').filter({ hasText: 'El precio de tu pedido cambió' })).toBeVisible();
    await expect.poll(() => fetches.count).toBeGreaterThan(before);
  });
});
