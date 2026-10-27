/**
 * Botón de arrepentimiento (Disp. 954/2025): enlace en el Footer y formulario público.
 *
 * Pre-condición: servidor de dev corriendo en http://localhost:5173.
 * El backend se simula con page.route(): estas pruebas no necesitan POST /api/withdrawals real.
 */

import { test, expect, type Page, type Route } from '@playwright/test';

const WITHDRAWAL_PATH = '/arrepentimiento';
const WITHDRAWALS_ENDPOINT = '**/withdrawals';
const RECEIPT_CODE = 'ARR-2026-0001';
const SLOW_RESPONSE_MS = 800;

const fulfillCreated = (route: Route) =>
  route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, code: RECEIPT_CODE, receivedAt: new Date().toISOString() }),
  });

async function fillForm(page: Page) {
  await page.getByLabel('Nombre y apellido').fill('María Pérez');
  await page.getByLabel('Email con el que compraste').fill('maria@example.com');
  await page.getByLabel('¿Qué compraste?').fill('Campera negra talle M, comprada el 6/10');
}

test.describe('Botón de arrepentimiento', () => {
  test('el Footer muestra el enlace con el texto exacto y lleva al formulario', async ({ page }) => {
    await page.goto('/contact');
    const link = page.getByRole('link', { name: 'BOTÓN DE ARREPENTIMIENTO' });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${WITHDRAWAL_PATH}$`));
    await expect(page.getByRole('heading', { level: 1, name: /arrepentimiento/i })).toBeVisible();
  });

  test('no deja enviar vacío y muestra errores por campo sin llamar al backend', async ({ page }) => {
    let requests = 0;
    await page.route(WITHDRAWALS_ENDPOINT, (route) => { requests += 1; return fulfillCreated(route); });
    await page.goto(WITHDRAWAL_PATH);

    await page.getByRole('button', { name: 'Solicitar arrepentimiento' }).click();

    await expect(page.getByText('El nombre es requerido')).toBeVisible();
    await expect(page.getByText('El correo electrónico es requerido')).toBeVisible();
    await expect(page.getByText('Contanos qué compraste')).toBeVisible();
    expect(requests).toBe(0);
  });

  test('el número de pedido es opcional pero se valida si se completa', async ({ page }) => {
    await page.goto(WITHDRAWAL_PATH);
    await page.getByLabel('N° de pedido (opcional)').fill('abc');
    await page.getByLabel('N° de pedido (opcional)').blur();
    await expect(page.getByText('Ingresá solo el número, por ejemplo 1001')).toBeVisible();
  });

  test('envío exitoso: muestra el código de seguimiento y el aviso de 24 h', async ({ page }) => {
    await page.route(WITHDRAWALS_ENDPOINT, fulfillCreated);
    await page.goto(WITHDRAWAL_PATH);
    await fillForm(page);
    await page.getByLabel('N° de pedido (opcional)').fill('#1001');

    await page.getByRole('button', { name: 'Solicitar arrepentimiento' }).click();

    await expect(page.getByTestId('withdrawal-code')).toHaveText(RECEIPT_CODE);
    await expect(page.getByText(/dentro de las 24 horas/)).toBeVisible();
  });

  test('doble click: se envía una sola solicitud', async ({ page }) => {
    let requests = 0;
    await page.route(WITHDRAWALS_ENDPOINT, async (route) => {
      requests += 1;
      await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_MS));
      await fulfillCreated(route);
    });
    await page.goto(WITHDRAWAL_PATH);
    await fillForm(page);

    const submit = page.getByRole('button', { name: 'Solicitar arrepentimiento' });
    await submit.dblclick();

    await expect(page.getByTestId('withdrawal-code')).toBeVisible();
    expect(requests).toBe(1);
  });

  test('error del servidor: muestra el mensaje y conserva lo escrito', async ({ page }) => {
    await page.route(WITHDRAWALS_ENDPOINT, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'No pudimos registrar tu solicitud.' }),
      }));
    await page.goto(WITHDRAWAL_PATH);
    await fillForm(page);

    await page.getByRole('button', { name: 'Solicitar arrepentimiento' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'No pudimos registrar tu solicitud.' })).toBeVisible();
    await expect(page.getByLabel('Nombre y apellido')).toHaveValue('María Pérez');
  });

  test('rate limit (429): informa que esperen', async ({ page }) => {
    await page.route(WITHDRAWALS_ENDPOINT, (route) =>
      route.fulfill({ status: 429, contentType: 'application/json', body: '{}' }));
    await page.goto(WITHDRAWAL_PATH);
    await fillForm(page);

    await page.getByRole('button', { name: 'Solicitar arrepentimiento' }).click();

    await expect(page.getByText(/varios intentos seguidos/)).toBeVisible();
  });
});
