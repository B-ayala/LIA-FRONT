import { test, expect } from '@playwright/test';
import type { Size } from '../src/types/size';
import { findDuplicateMeasurementError, sanitizeMeasurements } from '../src/utils/sizeMeasurements';
import type { SizeGuide } from '../src/types/product';
import {
  addCustomColumn,
  addGlobalColumn,
  defaultGuideForType,
  DEFAULT_SIZE_COLUMNS,
  findColumnBySizeId,
  isGlobalColumn,
  isUntouchedFallbackGuide,
  pruneColumnSources,
  removeColumn,
  type GuideChange,
} from '../src/utils/sizeGuideColumns';
import {
  formatSizeLabel,
  groupSizesByGarment,
  listGarments,
  matchesGarmentFilter,
  normalizeGarment,
  NO_GARMENT_FILTER,
} from '../src/utils/sizeGarment';

// Pruebas unitarias de helpers puros (sin navegador ni backend): `npx playwright test e2e/size-helpers.spec.ts --project=chromium`.

const makeSize = (overrides: Partial<Size> & Pick<Size, 'id' | 'name'>): Size => ({
  type: 'indumentaria',
  garment: null,
  measurements: {},
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

test.describe('medidas del catálogo de talles', () => {
  test('sanitizeMeasurements recorta a los límites del backend', () => {
    const result = sanitizeMeasurements({ ['k'.repeat(40)]: 'v'.repeat(40) });
    const [[key, value]] = Object.entries(result);
    expect(key).toHaveLength(30);
    expect(value).toHaveLength(20);
  });

  test('sanitizeMeasurements descarta medidas sin nombre y respeta el máximo de 8', () => {
    const many = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`M${i}`, `${i}`]));
    const result = sanitizeMeasurements({ ' Pecho ': ' 100 ', '': 'x', ...many });
    expect(result.Pecho).toBe('100');
    expect(Object.keys(result)).toHaveLength(8);
  });

  test('medidas repetidas (sin distinguir mayúsculas) se detectan', () => {
    expect(findDuplicateMeasurementError([{ key: 'Pecho', value: '1' }, { key: ' pecho', value: '2' }])).toContain('repetida');
    expect(findDuplicateMeasurementError([{ key: 'Pecho', value: '1' }, { key: '', value: '' }, { key: '', value: '' }])).toBeNull();
  });
});

test.describe('prenda de los talles globales', () => {
  const mCamisa = makeSize({ id: 'mc', name: 'M', garment: 'Camisa' });
  const mSaco = makeSize({ id: 'ms', name: 'M', garment: 'Saco' });
  const sCamisa = makeSize({ id: 'sc', name: 'S', garment: 'camisa' });
  const xlGeneral = makeSize({ id: 'xg', name: 'XL' });
  const all = [mSaco, xlGeneral, mCamisa, sCamisa];

  test('normalizeGarment recorta y convierte vacío en null', () => {
    expect(normalizeGarment('  Camisa ')).toBe('Camisa');
    expect(normalizeGarment('   ')).toBeNull();
    expect(normalizeGarment(null)).toBeNull();
    expect(normalizeGarment(undefined)).toBeNull();
  });

  test('agrupa por prenda: General primero, prendas A-Z sin distinguir mayúsculas, talles ordenados', () => {
    const groups = groupSizesByGarment(all);
    expect(groups.map((group) => group.label)).toEqual(['General', 'Camisa', 'Saco']);
    expect(groups[1].sizes.map((size) => size.id)).toEqual(['mc', 'sc']);
    expect(groups[1].sizes.map((size) => size.name)).toEqual(['M', 'S']);
  });

  test('listGarments devuelve prendas únicas ordenadas y sin la vacía', () => {
    expect(listGarments(all)).toEqual(['Camisa', 'Saco']);
    expect(listGarments([xlGeneral])).toEqual([]);
  });

  test('matchesGarmentFilter: todas, sin prenda y una prenda', () => {
    expect(all.filter((size) => matchesGarmentFilter(size, ''))).toHaveLength(4);
    expect(all.filter((size) => matchesGarmentFilter(size, NO_GARMENT_FILTER)).map((size) => size.id)).toEqual(['xg']);
    expect(all.filter((size) => matchesGarmentFilter(size, 'Camisa')).map((size) => size.id)).toEqual(['mc', 'sc']);
  });

  test('formatSizeLabel: "M · Camisa" o solo el nombre', () => {
    expect(formatSizeLabel(mCamisa)).toBe('M · Camisa');
    expect(formatSizeLabel(xlGeneral)).toBe('XL');
  });
});

test.describe('columnas de la guía de talles (globales vs propias)', () => {
  const emptyGuide: SizeGuide = { type: 'indumentaria', columns: [], rows: [] };
  const mGlobal = makeSize({ id: 'm1', name: 'm', garment: 'Camisa', measurements: { Pecho: '91 cm', Largo: '70 cm' } });

  const must = (change: GuideChange): SizeGuide => {
    if (!change.ok) throw new Error(change.error);
    return change.guide;
  };
  const errorOf = (change: GuideChange): string => (change.ok ? '' : change.error);

  test('agregar un global: columna en MAYÚSCULAS con origen y precarga de medidas', () => {
    const guide = must(addGlobalColumn(emptyGuide, mGlobal));
    expect(guide.columns).toEqual(['M']);
    expect(guide.columnSources).toEqual({ M: { sizeId: 'm1' } });
    expect(isGlobalColumn(guide, 'M')).toBe(true);
    expect(findColumnBySizeId(guide, 'm1')).toBe('M');
    expect(guide.rows).toEqual([
      { label: 'Pecho', values: { M: '91 cm' } },
      { label: 'Largo', values: { M: '70 cm' } },
    ]);
  });

  test('un global desactivado se rechaza', () => {
    const change = addGlobalColumn(emptyGuide, makeSize({ id: 'x', name: 'X', active: false }));
    expect(change.ok).toBe(false);
    expect(errorOf(change)).toContain('desactivado');
  });

  test('un global de otro tipo no se ofrece', () => {
    const change = addGlobalColumn(emptyGuide, makeSize({ id: 'c', name: '40', type: 'calzado' }));
    expect(change.ok).toBe(false);
  });

  test('duplicado global-global y global-propio (ambos órdenes)', () => {
    const withGlobal = must(addGlobalColumn(emptyGuide, mGlobal));
    expect(errorOf(addGlobalColumn(withGlobal, mGlobal))).toBe('Este talle ya está en la guía.');
    expect(errorOf(addCustomColumn(withGlobal, ' m '))).toContain('talle global M ya está en la guía');

    const withCustom = must(addCustomColumn(emptyGuide, 'm'));
    expect(errorOf(addGlobalColumn(withCustom, mGlobal))).toBe('Ya cargaste un talle propio M en esta guía. Quitalo si querés usar el global.');
    expect(errorOf(addCustomColumn(withCustom, 'M'))).toBe('Este talle ya está en la guía.');
    expect(withCustom.columnSources).toBeUndefined();
  });

  test('un propio vacío se rechaza y no precarga nada', () => {
    expect(addCustomColumn(emptyGuide, '   ').ok).toBe(false);
    const guide = must(addCustomColumn(emptyGuide, 'xxxl'));
    expect(guide.columns).toEqual(['XXXL']);
    expect(guide.rows).toEqual([]);
    expect(isGlobalColumn(guide, 'XXXL')).toBe(false);
  });

  test('quitar un global y volver a agregarlo lo deja global', () => {
    const added = must(addGlobalColumn(emptyGuide, mGlobal));
    const removed = removeColumn(added, 'M');
    expect(removed.columns).toEqual([]);
    expect('columnSources' in removed).toBe(false);
    expect(isGlobalColumn(must(addGlobalColumn(removed, mGlobal)), 'M')).toBe(true);
  });

  test('quitar un propio no toca nada más', () => {
    const guide = must(addCustomColumn(must(addGlobalColumn(emptyGuide, mGlobal)), 'S'));
    const removed = removeColumn(guide, 'S');
    expect(removed.columns).toEqual(['M']);
    expect(removed.columnSources).toEqual({ M: { sizeId: 'm1' } });
    expect(removed.rows).toEqual(guide.rows);
  });

  test('remove borra los valores de esa columna en todas las filas', () => {
    const guide: SizeGuide = {
      type: 'indumentaria',
      columns: ['S', 'M'],
      rows: [{ label: 'Pecho', values: { S: '1', M: '2' } }, { label: 'Largo', values: { M: '3' } }],
    };
    expect(removeColumn(guide, 'M').rows).toEqual([{ label: 'Pecho', values: { S: '1' } }, { label: 'Largo', values: {} }]);
  });

  test('precarga: completa una fila existente (label sin distinguir mayúsculas) solo en celdas vacías', () => {
    const guide: SizeGuide = {
      type: 'indumentaria',
      columns: ['S'],
      rows: [{ label: ' pecho ', values: { S: '80' } }],
    };
    const result = must(addGlobalColumn(guide, mGlobal));
    expect(result.rows[0]).toEqual({ label: ' pecho ', values: { S: '80', M: '91 cm' } });
    expect(result.rows).toHaveLength(2);
  });

  test('precarga: no pisa una celda con valor tipeado por el admin', () => {
    const guide: SizeGuide = { type: 'indumentaria', columns: ['S'], rows: [{ label: 'Pecho', values: { M: '99' } }] };
    expect(must(addGlobalColumn(guide, mGlobal)).rows[0].values.M).toBe('99');
  });

  test('precarga: una celda con solo espacios cuenta como vacía', () => {
    const guide: SizeGuide = { type: 'indumentaria', columns: [], rows: [{ label: 'Pecho', values: { M: '  ' } }] };
    expect(must(addGlobalColumn(guide, mGlobal)).rows[0].values.M).toBe('91 cm');
  });

  test('defaultGuideForType: sin columnas con globales activos; con las de siempre si no hay', () => {
    const standardRows = ['Busto', 'Cintura', 'Cadera', 'Entrepierna'].map((label) => ({ label, values: {} }));
    expect(defaultGuideForType('indumentaria', [mGlobal])).toEqual({ type: 'indumentaria', columns: [], rows: standardRows });
    expect(defaultGuideForType('indumentaria', [])).toEqual({ type: 'indumentaria', columns: DEFAULT_SIZE_COLUMNS.indumentaria, rows: standardRows });
    expect(defaultGuideForType('calzado', []).rows).toEqual([]);
    const onlyInactive = makeSize({ id: 'i', name: 'S', active: false });
    expect(defaultGuideForType('indumentaria', [onlyInactive]).columns).toEqual(DEFAULT_SIZE_COLUMNS.indumentaria);
    expect(defaultGuideForType('calzado', [mGlobal]).columns).toEqual(DEFAULT_SIZE_COLUMNS.calzado);
  });

  test('isUntouchedFallbackGuide distingue la guía intacta de una editada', () => {
    expect(isUntouchedFallbackGuide(defaultGuideForType('calzado', []))).toBe(true);
    expect(isUntouchedFallbackGuide(defaultGuideForType('indumentaria', []))).toBe(true);
    const withValue = defaultGuideForType('indumentaria', []);
    withValue.rows[0] = { label: 'Busto', values: { S: '86' } };
    expect(isUntouchedFallbackGuide(withValue)).toBe(false);
    expect(isUntouchedFallbackGuide({ type: 'calzado', columns: [], rows: [] })).toBe(false);
    const edited = must(addCustomColumn(defaultGuideForType('indumentaria', []), 'XXXL'));
    expect(isUntouchedFallbackGuide(edited)).toBe(false);
  });

  test('pruneColumnSources descarta orígenes de columnas inexistentes y omite el campo si queda vacío', () => {
    const guide: SizeGuide = { type: 'indumentaria', columns: ['M'], rows: [], columnSources: { M: { sizeId: 'a' }, L: { sizeId: 'b' } } };
    expect(pruneColumnSources(guide).columnSources).toEqual({ M: { sizeId: 'a' } });
    const none = pruneColumnSources({ ...guide, columns: ['S'] });
    expect('columnSources' in none).toBe(false);
  });
});
