import { test, expect } from '@playwright/test';
import type { Variant } from '../src/types/product';
import type { Size } from '../src/types/size';
import { getProductStockFromVariants, sanitizeProductVariants } from '../src/utils/productVariants';
import {
  addCustomSize,
  addGlobalSize,
  findDuplicateMeasurementError,
  pruneOptionMeta,
  removeSizeOption,
  sanitizeMeasurements,
  type SizeSelection,
} from '../src/utils/sizeOptionMeta';
import { buildSizeMeasurementTable, resolveSizeGuide } from '../src/utils/sizeGuideTable';

// Pruebas unitarias de helpers puros (sin navegador ni backend): `npx playwright test e2e/size-helpers.spec.ts --project=chromium`.

const makeSize = (overrides: Partial<Size> & Pick<Size, 'id' | 'name'>): Size => ({
  type: 'indumentaria',
  measurements: {},
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const EMPTY: SizeSelection = { options: [], optionMeta: {} };
const unwrap = (result: ReturnType<typeof addGlobalSize>): SizeSelection => {
  if (!result.ok) throw new Error(result.error);
  return result.selection;
};

test.describe('sanitizeProductVariants + optionMeta', () => {
  test('preserva optionMeta y poda opciones que ya no existen', () => {
    const variants: Variant[] = [{
      name: 'Talle',
      options: ['s', 'm'],
      stockByOption: { S: 2, M: 3 },
      optionMeta: {
        S: { source: 'global', sizeId: 'a' },
        L: { source: 'global', sizeId: 'b' },
        M: { source: 'custom', measurements: { Pecho: '90' } },
      },
    }];
    const [sized] = sanitizeProductVariants(variants) ?? [];
    expect(sized.options).toEqual(['S', 'M']);
    expect(sized.optionMeta).toEqual({
      S: { source: 'global', sizeId: 'a' },
      M: { source: 'custom', measurements: { Pecho: '90' } },
    });
  });

  test('global sin medidas, custom sin sizeId, global sin sizeId se descarta', () => {
    const variants: Variant[] = [{
      name: 'Talle',
      options: ['S', 'M', 'L'],
      optionMeta: {
        S: { source: 'global', sizeId: 'a', measurements: { Pecho: '1' } },
        M: { source: 'custom', sizeId: 'x' },
        L: { source: 'global' },
      },
    }];
    const [sized] = sanitizeProductVariants(variants) ?? [];
    expect(sized.optionMeta).toEqual({ S: { source: 'global', sizeId: 'a' }, M: { source: 'custom' } });
  });

  test('sin optionMeta queda undefined y el stock por talle no cambia', () => {
    const variants: Variant[] = [{ name: 'Talle', options: ['S', 'M'], stockByOption: { S: 2, M: 3 } }];
    const sanitized = sanitizeProductVariants(variants);
    expect(sanitized?.[0].optionMeta).toBeUndefined();
    expect(getProductStockFromVariants(sanitized)).toBe(5);
  });

  test('variantes que no son talle no llevan optionMeta', () => {
    const variants: Variant[] = [{ name: 'Color', options: ['Rojo'], optionMeta: { Rojo: { source: 'custom' } } }];
    expect(sanitizeProductVariants(variants)?.[0].optionMeta).toBeUndefined();
  });

  test('pruneOptionMeta devuelve undefined si no queda nada', () => {
    expect(pruneOptionMeta(['S'], { M: { source: 'custom' } })).toBeUndefined();
  });
});

test.describe('alta y baja de talles en el producto', () => {
  const sizeXl = makeSize({ id: 'xl', name: 'xl' });

  test('agrega un global en MAYÚSCULAS con sizeId y sin medidas', () => {
    const next = unwrap(addGlobalSize(EMPTY, sizeXl));
    expect(next.options).toEqual(['XL']);
    expect(next.optionMeta).toEqual({ XL: { source: 'global', sizeId: 'xl' } });
  });

  test('rechaza globales desactivados y repetidos', () => {
    expect(addGlobalSize(EMPTY, makeSize({ id: 'z', name: 'Z', active: false })).ok).toBe(false);
    const once = unwrap(addGlobalSize(EMPTY, sizeXl));
    expect(addGlobalSize(once, sizeXl).ok).toBe(false);
  });

  test('un propio con el mismo nombre que un global seleccionado se bloquea (sin distinguir mayúsculas)', () => {
    const withGlobal = unwrap(addGlobalSize(EMPTY, sizeXl));
    const result = addCustomSize(withGlobal, ' xl ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('global');
  });

  test('un global con el mismo nombre que un propio se bloquea y el propio no se convierte', () => {
    const withCustom = unwrap(addCustomSize(EMPTY, 'xl'));
    const result = addGlobalSize(withCustom, sizeXl);
    expect(result.ok).toBe(false);
    expect(withCustom.optionMeta.XL.source).toBe('custom');
  });

  test('propio: normaliza medidas, descarta vacías y respeta el máximo de 8', () => {
    const many = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`M${i}`, `${i}`]));
    const next = unwrap(addCustomSize(EMPTY, 'xxxl', { ' Pecho ': ' 100 ', '': 'x', ...many }));
    expect(next.options).toEqual(['XXXL']);
    const measurements = next.optionMeta.XXXL.measurements ?? {};
    expect(measurements.Pecho).toBe('100');
    expect(Object.keys(measurements)).toHaveLength(8);
  });

  test('propio vacío o repetido da error', () => {
    expect(addCustomSize(EMPTY, '   ').ok).toBe(false);
    const once = unwrap(addCustomSize(EMPTY, 'm'));
    expect(addCustomSize(once, 'M').ok).toBe(false);
  });

  test('quitar un global y volver a agregarlo lo deja global', () => {
    const added = unwrap(addGlobalSize(EMPTY, sizeXl));
    const removed = removeSizeOption(added, 'XL');
    expect(removed).toEqual({ options: [], optionMeta: {} });
    const again = unwrap(addGlobalSize(removed, sizeXl));
    expect(again.optionMeta.XL.source).toBe('global');
  });

  test('sanitizeMeasurements recorta a los límites del backend', () => {
    const result = sanitizeMeasurements({ ['k'.repeat(40)]: 'v'.repeat(40) });
    const [[key, value]] = Object.entries(result);
    expect(key).toHaveLength(30);
    expect(value).toHaveLength(20);
  });

  test('medidas repetidas (sin distinguir mayúsculas) se detectan', () => {
    expect(findDuplicateMeasurementError([{ key: 'Pecho', value: '1' }, { key: ' pecho', value: '2' }])).toContain('repetida');
    expect(findDuplicateMeasurementError([{ key: 'Pecho', value: '1' }, { key: '', value: '' }, { key: '', value: '' }])).toBeNull();
  });
});

test.describe('guía de talles', () => {
  const catalog = new Map<string, Size>([
    ['s', makeSize({ id: 's', name: 'S', measurements: { Pecho: '86', Largo: '60' } })],
    ['m', makeSize({ id: 'm', name: 'M', measurements: { Pecho: '91' } })],
  ]);

  test('una fila por talle (orden del producto) y columnas = unión de medidas', () => {
    const table = buildSizeMeasurementTable(
      ['M', 'S', 'XXL', 'ESPECIAL'],
      {
        M: { source: 'global', sizeId: 'm' },
        S: { source: 'global', sizeId: 's' },
        XXL: { source: 'custom' },
        ESPECIAL: { source: 'custom', measurements: { Cintura: '70', Pecho: '99' } },
      },
      catalog,
    );
    expect(table.rows.map((row) => row.size)).toEqual(['M', 'S', 'XXL', 'ESPECIAL']);
    expect(table.columns).toEqual(['Pecho', 'Largo', 'Cintura']);
    expect(table.rows[0].values).toEqual({ Pecho: '91' });
    expect(table.rows[2].values).toEqual({});
  });

  test('global sin catálogo cargado o sin sizeId resuelto queda sin medidas', () => {
    const table = buildSizeMeasurementTable(['S'], { S: { source: 'global', sizeId: 's' } });
    expect(table.columns).toEqual([]);
  });

  test('resolveSizeGuide: tabla, fallback legacy y nada', () => {
    const withMeasures: Variant = { name: 'Talle', options: ['S'], optionMeta: { S: { source: 'global', sizeId: 's' } } };
    expect(resolveSizeGuide(withMeasures, undefined, catalog).kind).toBe('table');

    const legacy = { type: 'indumentaria' as const, rows: [{ label: 'Pecho', values: { S: '86' } }] };
    const noMeasures: Variant = { name: 'Talle', options: ['S'] };
    expect(resolveSizeGuide(noMeasures, legacy, catalog).kind).toBe('legacy');
    expect(resolveSizeGuide(noMeasures, { rows: [] }, catalog).kind).toBe('none');
    expect(resolveSizeGuide(undefined, undefined, catalog).kind).toBe('none');
  });

  test('si hay medidas en los talles, la tabla gana a la guía legacy', () => {
    const variant: Variant = { name: 'Talle', options: ['S'], optionMeta: { S: { source: 'custom', measurements: { Pecho: '1' } } } };
    const legacy = { rows: [{ label: 'X', values: {} }] };
    expect(resolveSizeGuide(variant, legacy).kind).toBe('table');
  });
});
