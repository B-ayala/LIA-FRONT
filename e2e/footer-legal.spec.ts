/**
 * Footer legal: datos del vendedor y sello Data Fiscal (ARCA).
 *
 * Pre-condición: servidor de dev corriendo en http://localhost:5173.
 * El contenido del footer (site_content) se simula con page.route(); no toca Supabase real.
 */

import { test, expect, type Page } from '@playwright/test';

const SITE_CONTENT_ENDPOINT = '**/rest/v1/site_content*';
const FOOTER_BASE = {
  brandName: 'LIA',
  description: 'Moda',
  whatsapp: '',
  email: '',
  tiktokUser: '',
  tiktokUrl: '',
  facebookUser: '',
  facebookUrl: '',
  address: '',
  mapQuery: '',
  copyright: 'LIA',
};
const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 667 },
];

async function mockFooter(page: Page, extra: Record<string, string>) {
  await page.route(SITE_CONTENT_ENDPOINT, (route) => {
    if (!route.request().url().includes('key=eq.footer')) return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ value: { ...FOOTER_BASE, ...extra }, updated_at: new Date().toISOString() }),
    });
  });
}

test.describe('Footer legal', () => {
  test('sin datos cargados no muestra el bloque del vendedor ni Data Fiscal', async ({ page }) => {
    await mockFooter(page, {});
    await page.goto('/contact');
    await expect(page.getByRole('link', { name: 'BOTÓN DE ARREPENTIMIENTO' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Datos del vendedor' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Data Fiscal/ })).toHaveCount(0);
  });

  test('con datos cargados muestra solo las filas completas', async ({ page }) => {
    await mockFooter(page, { legalName: 'Tienda SRL', cuit: '20-12345678-6' });
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: 'Datos del vendedor' })).toBeVisible();
    await expect(page.getByText('Tienda SRL')).toBeVisible();
    await expect(page.getByText('20-12345678-6')).toBeVisible();
    await expect(page.getByText('Horario de atención')).toHaveCount(0);
  });

  test('Data Fiscal oficial: enlace seguro en pestaña nueva', async ({ page }) => {
    await mockFooter(page, { dataFiscalUrl: 'https://qr.afip.gob.ar/?qr=abc123' });
    await page.goto('/');
    const link = page.getByRole('link', { name: /Data Fiscal/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://qr.afip.gob.ar/?qr=abc123');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  });

  test('Data Fiscal con host ajeno guardado en la base no se renderiza', async ({ page }) => {
    await mockFooter(page, { dataFiscalUrl: 'https://sitio-malicioso.example/?qr=1' });
    await page.goto('/contact');
    await expect(page.getByRole('link', { name: 'BOTÓN DE ARREPENTIMIENTO' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Data Fiscal/ })).toHaveCount(0);
  });

  for (const viewport of VIEWPORTS) {
    test(`sin desborde horizontal a ${viewport.width}px con todos los datos`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await mockFooter(page, {
        legalName: 'Una razón social bastante larga para probar el corte de línea S.R.L.',
        cuit: '20-12345678-6',
        fiscalAddress: 'Avenida Muy Larga 12345, Piso 10 Depto B, Ciudad Autónoma de Buenos Aires',
        businessHours: 'Lunes a viernes de 9 a 18 h',
        responsibleArea: 'Atención al cliente',
        dataFiscalUrl: 'https://qr.afip.gob.ar/?qr=abc123',
      });
      await page.goto('/contact');
      await expect(page.getByRole('heading', { name: 'Datos del vendedor' })).toBeVisible();
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);
    });
  }
});
