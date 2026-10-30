/**
 * Precio informativo "con transferencia": campo opcional en el modal de producto (admin) y línea
 * roja bajo el precio en el detalle público.
 *
 * Pre-condición: servidor de dev corriendo en http://localhost:5173.
 * El backend y Supabase se simulan con page.route(): no se escribe nada en la base real.
 */

import { test, expect, type Page, type Route } from '@playwright/test';

const ADMIN = { id: '11111111-1111-4111-8111-111111111111', name: 'Admin', email: 'admin@example.test', role: 'admin' };
const PRODUCT_ID = 77;
const TRANSFER_LABEL = /En transferencia/;
const DANGER_RGB = 'rgb(180, 35, 24)';

const baseRow = {
  id: PRODUCT_ID,
  name: 'Sandalia Test',
  price: 71500,
  original_price: null,
  transfer_price: 64350,
  stock: 5,
  category: 'Calzado',
  image_url: 'https://example.test/a.jpg',
  images: ['https://example.test/a.jpg'],
  description: 'Sandalia de prueba',
  discount: null,
  condition: 'new',
  free_shipping: false,
  hover_image_enabled: true,
  card_options: null,
  variants: [
    { name: 'Talle', options: ['38', '39'], stockByOption: { '38': 3, '39': 2 } },
    { name: 'Color', options: ['Negro'], colorsByOption: { Negro: '#000000' } },
  ],
  status: 'active',
  featured: false,
  updated_at: '2026-10-30T10:00:00.123456+00:00',
};

const fulfillJson = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** `maybeSingle()` pide un objeto (Accept vnd.pgrst.object); las listas piden un array. */
const mockProducts = (page: Page, row: Record<string, unknown>) =>
  page.route('**/rest/v1/productos*', (route) => {
    if (route.request().method() !== 'GET') return fulfillJson(route, 200, []);
    const wantsObject = (route.request().headers().accept ?? '').includes('vnd.pgrst.object');
    return fulfillJson(route, 200, wantsObject ? row : [row]);
  });

const mockAdmin = async (page: Page) => {
  await page.route('**/api/auth/refresh', (route) =>
    fulfillJson(route, 200, { data: { user: ADMIN, accessToken: 'tok', expiresIn: 3600 } }));
  await page.route('**/rest/v1/categories*', (route) => fulfillJson(route, 200, []));
  await page.addInitScript(() => localStorage.removeItem('lia:auth-no-session'));
};

/** Captura el body del PUT/POST a /api/products y responde OK. */
const captureProductWrite = (page: Page) => {
  const bodies: Array<Record<string, unknown>> = [];
  void page.route('**/api/products**', (route) => {
    const request = route.request();
    if (request.method() === 'PUT' || request.method() === 'POST') {
      bodies.push(JSON.parse(request.postData() ?? '{}'));
      return fulfillJson(route, 200, { success: true, data: {} });
    }
    return route.continue();
  });
  return bodies;
};

const openEditor = async (page: Page) => {
  await page.goto('/admin/products');
  await page.locator('button[title="Editar"]:visible').first().click();
  await expect(page.getByRole('heading', { name: 'Editar Producto' })).toBeVisible();
};

/** El aviso "faltan datos" es opcional según el producto: se continúa si aparece. */
const goToPreview = async (page: Page) => {
  await page.getByRole('button', { name: 'Ver vista previa' }).click();
  const proceed = page.getByRole('button', { name: 'Continuar igualmente' });
  // waitFor sí espera (isVisible no): si el aviso no aparece en 1,5 s se sigue sin confirmarlo.
  await proceed.waitFor({ state: 'visible', timeout: 1500 }).then(() => proceed.click(), () => undefined);
  await expect(page).toHaveURL(/\/admin\/products\/preview$/);
};

test.describe('Detalle público', () => {
  test('TC-TRF-01: muestra "$X con Transferencia" en rojo bajo el precio', async ({ page }) => {
    await mockProducts(page, baseRow);
    await page.goto(`/product/${PRODUCT_ID}`);

    const line = page.getByText('$64.350,00 con Transferencia');
    await expect(line).toBeVisible();
    await expect(line).toHaveCSS('color', DANGER_RGB);
    await expect(page.getByText('$71.500,00', { exact: true })).toBeVisible();
  });

  test('TC-TRF-02: sin precio de transferencia no aparece la línea', async ({ page }) => {
    await mockProducts(page, { ...baseRow, transfer_price: null });
    await page.goto(`/product/${PRODUCT_ID}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Sandalia Test' })).toBeVisible();
    await expect(page.getByText(/con Transferencia/)).toHaveCount(0);
  });
});

test.describe('Precio sin impuestos (IVA 21 % incluido)', () => {
  const cases = [
    { price: 88600, expected: '$73.223,14' },
    { price: 71500, expected: '$59.090,91' },
    { price: 0.01, expected: '$0,01' },
  ];

  for (const { price, expected } of cases) {
    test(`TC-IVA-01: precio ${price} muestra "Precio sin impuestos ${expected}"`, async ({ page }) => {
      await mockProducts(page, { ...baseRow, price });
      await page.goto(`/product/${PRODUCT_ID}`);
      await expect(page.getByText(`Precio sin impuestos ${expected}`, { exact: true })).toBeVisible();
    });
  }

  test('TC-IVA-02: con descuento calcula sobre el precio final, no sobre el original', async ({ page }) => {
    await mockProducts(page, { ...baseRow, price: 100000, discount: 10 });
    await page.goto(`/product/${PRODUCT_ID}`);
    await expect(page.getByText('Precio sin impuestos $74.380,17', { exact: true })).toBeVisible();
  });

  for (const width of [320, 375, 1440]) {
    test(`TC-IVA-04: a ${width}px "con Transferencia" no se parte y no hay scroll horizontal`, async ({ page }) => {
      await page.setViewportSize({ width, height: 760 });
      await mockProducts(page, { ...baseRow, price: 100000, discount: 10, transfer_price: 85000 });
      await page.goto(`/product/${PRODUCT_ID}`);

      const label = page.locator('.pricing__transfer-label');
      await expect(label).toBeVisible();
      const lineCount = await label.evaluate((el) => el.getClientRects().length);
      expect(lineCount).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    });
  }

  test('TC-IVA-03: sin precio válido no se muestra la línea', async ({ page }) => {
    await mockProducts(page, { ...baseRow, price: 0 });
    await page.goto(`/product/${PRODUCT_ID}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Sandalia Test' })).toBeVisible();
    await expect(page.getByText(/Precio sin impuestos/)).toHaveCount(0);
  });
});

test.describe('Admin: modal de producto', () => {
  test('TC-TRF-03/04: edita el valor, la vista previa lo muestra y se guarda en el PUT', async ({ page }) => {
    await mockAdmin(page);
    await mockProducts(page, baseRow);
    const writes = captureProductWrite(page);

    await openEditor(page);
    const field = page.getByLabel(TRANSFER_LABEL);
    await expect(field).toHaveValue('64350');
    await expect(field).toHaveCSS('color', DANGER_RGB);

    await field.fill('60000');
    await goToPreview(page);
    await page.getByRole('tab', { name: /Vista Detalle/ }).click();
    await expect(page.getByText('$60.000,00 con Transferencia')).toBeVisible();

    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].transferPrice).toBe(60000);
  });

  test('TC-TRF-04: sin tocar el campo se conserva en el PUT', async ({ page }) => {
    await mockAdmin(page);
    await mockProducts(page, baseRow);
    const writes = captureProductWrite(page);

    await openEditor(page);
    await goToPreview(page);
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].transferPrice).toBe(64350);
  });

  test('TC-TRF-03: vaciar el campo manda null para borrarlo', async ({ page }) => {
    await mockAdmin(page);
    await mockProducts(page, baseRow);
    const writes = captureProductWrite(page);

    await openEditor(page);
    await page.getByLabel(TRANSFER_LABEL).fill('');
    await goToPreview(page);
    await page.getByRole('tab', { name: /Vista Detalle/ }).click();
    await expect(page.getByText(/con Transferencia/)).toHaveCount(0);

    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toHaveProperty('transferPrice', null);
  });

  for (const invalid of ['0', '-5']) {
    test(`TC-TRF-05: "${invalid}" muestra error inline y no avanza`, async ({ page }) => {
      await mockAdmin(page);
      await mockProducts(page, baseRow);

      await openEditor(page);
      await page.getByLabel(TRANSFER_LABEL).fill(invalid);
      await page.getByRole('button', { name: 'Ver vista previa' }).click();

      await expect(page.getByText(/debe ser mayor a 0 \(o dejalo vacío\)/)).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/products$/);
    });
  }

  for (const width of [375, 320]) {
    test(`TC-TRF-07: a ${width}px el label enfoca el input y el campo no sobresale más que sus vecinos`, async ({ page }) => {
      await page.setViewportSize({ width, height: 760 });
      await mockAdmin(page);
      await mockProducts(page, baseRow);

      await openEditor(page);
      await page.getByText(TRANSFER_LABEL).first().click();
      await expect(page.getByLabel(TRANSFER_LABEL)).toBeFocused();

      // Hallazgo previo (HALL-TRF-01): con este producto la grilla de "Datos Básicos" mide ~24 px más
      // que el modal a 375 px y recorta todos los campos por igual. Acá se exige que el campo nuevo
      // no sobresalga más que "Condición", su vecino.
      const rights = await page.evaluate(() => {
        const rightOf = (el: Element | null | undefined) => (el ? el.getBoundingClientRect().right : Number.NaN);
        const condition = Array.from(document.querySelectorAll('select')).find((select) => select.textContent?.includes('Nuevo'));
        return { transfer: rightOf(document.getElementById('product-transfer-price')), condition: rightOf(condition) };
      });
      expect(rights.transfer).toBeLessThanOrEqual(rights.condition + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
      await page.screenshot({ path: `test-results/transfer-modal-${width}.png` });
    });
  }

  test('crear producto nuevo con precio de transferencia lo envía en el POST', async ({ page }) => {
    await mockAdmin(page);
    await mockProducts(page, baseRow);
    const writes = captureProductWrite(page);

    await page.goto('/admin/products');
    await page.getByRole('button', { name: /Nuevo Producto/ }).click();
    await page.getByPlaceholder('Ej: Remera Básica').fill('Zapato Nuevo');
    await page.getByPlaceholder('0.00').fill('50000');
    await page.getByLabel(TRANSFER_LABEL).fill('45000');
    await goToPreview(page);
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toMatchObject({ price: 50000, transferPrice: 45000 });
  });
});
