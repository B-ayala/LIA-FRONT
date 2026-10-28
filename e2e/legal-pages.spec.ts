/**
 * Páginas legales (Términos, Privacidad, Cambios y devoluciones) y sus enlaces del Footer.
 *
 * Pre-condición: servidor de dev corriendo en http://localhost:5173.
 */

import { test, expect } from '@playwright/test';

const PAGES = [
  { link: 'Términos y condiciones', path: '/terminos', heading: 'Términos y condiciones' },
  { link: 'Política de privacidad', path: '/privacidad', heading: 'Política de privacidad' },
  { link: 'Cambios y devoluciones', path: '/cambios-y-devoluciones', heading: 'Cambios y devoluciones' },
];
const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 667 },
];

test.describe('Páginas legales', () => {
  for (const { link, path, heading } of PAGES) {
    test(`el Footer enlaza a ${path} y la página muestra el aviso de borrador`, async ({ page }) => {
      await page.goto('/contact');
      await page.getByRole('navigation', { name: 'Información legal' }).getByRole('link', { name: link }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.getByText('Borrador para revisión legal')).toBeVisible();
    });
  }

  test('el Footer enlaza a la ventanilla de reclamos en una pestaña nueva y segura', async ({ page }) => {
    await page.goto('/contact');
    const link = page.getByRole('link', { name: 'Ingrese aquí' });
    await expect(link).toHaveAttribute('href', 'https://autogestion.produccion.gob.ar/consumidores');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  });

  test('cada página legal muestra su versión', async ({ page }) => {
    await page.goto('/terminos');
    await expect(page.getByText(/^Versión \d{4}-\d{2}-\d{2}$/)).toBeVisible();
  });

  test('Cambios y devoluciones enlaza al botón de arrepentimiento', async ({ page }) => {
    await page.goto('/cambios-y-devoluciones');
    await page.getByRole('main').getByRole('link', { name: 'botón de arrepentimiento' }).click();
    await expect(page).toHaveURL(/\/arrepentimiento$/);
  });

  for (const viewport of VIEWPORTS) {
    test(`sin scroll horizontal a ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      for (const { path } of PAGES) {
        await page.goto(path);
        const overflows = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        expect(overflows, path).toBe(false);
      }
    });
  }
});
