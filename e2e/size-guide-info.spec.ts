import { test, expect } from '@playwright/test';
import type { SizeGuide } from '../src/types/product';
import {
  cleanGuideInfo,
  defaultMeasureRows,
  findGuideProblem,
  formatModelHeight,
  guideSizesNotForSale,
  guideTableStatus,
  hasGuideContent,
  measuresToExplain,
  resolveFitReference,
  resolveGuideNotes,
  visibleFitReference,
} from '../src/utils/sizeGuideInfo';
import { DEFAULT_SIZE_GUIDE_CONTENT, normalizeSizeGuideContent } from '../src/utils/sizeGuideContent';

// Pruebas unitarias de helpers puros (sin navegador ni backend): `npx playwright test e2e/size-guide-info.spec.ts --project=chromium`.

const IMG = 'https://res.cloudinary.com/demo/image/upload/modelo.jpg';
const guideWith = (overrides: Partial<SizeGuide>): SizeGuide => ({
  type: 'indumentaria',
  columns: ['S', 'M'],
  rows: [{ label: 'Busto', values: { S: '86', M: '90' } }],
  ...overrides,
});

test.describe('estado de la tabla', () => {
  test('sin valores es "empty": la tienda no publica una tabla que parezca verificada', () => {
    expect(guideTableStatus(guideWith({ rows: defaultMeasureRows('indumentaria') }))).toBe('empty');
    expect(guideTableStatus({ rows: [] })).toBe('empty');
  });

  test('con celdas vacías es "partial" y completa es "complete"', () => {
    expect(guideTableStatus(guideWith({ rows: [{ label: 'Busto', values: { S: '86' } }] }))).toBe('partial');
    expect(guideTableStatus(guideWith({}))).toBe('complete');
  });

  test('las filas sin nombre no cuentan', () => {
    const rows = [{ label: 'Busto', values: { S: '86', M: '90' } }, { label: '  ', values: {} }];
    expect(guideTableStatus(guideWith({ rows }))).toBe('complete');
  });
});

test.describe('aclaraciones', () => {
  const globalNotes = DEFAULT_SIZE_GUIDE_CONTENT.notes;

  test('sin base indicada se omite la aclaración que la nombra', () => {
    const notes = resolveGuideNotes(guideWith({}), globalNotes, 'complete');
    expect(notes).toHaveLength(globalNotes.length - 1);
    expect(notes.join(' ')).not.toContain('{medidas}');
  });

  test('con base y valores, el token se reemplaza', () => {
    expect(resolveGuideNotes(guideWith({ measurementBasis: 'garment' }), globalNotes, 'complete')[0])
      .toBe('Las medidas de la tabla corresponden a medidas de la prenda.');
    expect(resolveGuideNotes(guideWith({ measurementBasis: 'body' }), globalNotes, 'partial')[0])
      .toBe('Las medidas de la tabla corresponden a medidas corporales.');
  });

  test('con base pero sin valores tampoco se afirma la base', () => {
    const notes = resolveGuideNotes(guideWith({ measurementBasis: 'body' }), globalNotes, 'empty');
    expect(notes.some((note) => note.includes('corresponden a'))).toBe(false);
  });

  test('las propias del producto reemplazan a las globales, también vacías', () => {
    expect(resolveGuideNotes(guideWith({ notes: ['Solo esta.'] }), globalNotes, 'complete')).toEqual(['Solo esta.']);
    expect(resolveGuideNotes(guideWith({ notes: [] }), globalNotes, 'complete')).toEqual([]);
  });
});

test.describe('cómo tomar las medidas', () => {
  test('calzado no explica medidas del cuerpo', () => {
    expect(measuresToExplain(guideWith({ type: 'calzado' }))).toEqual([]);
  });

  test('explica solo las medidas que tiene la tabla, sin importar mayúsculas ni tildes', () => {
    const rows = [{ label: 'CINTURA (cm)', values: {} }, { label: 'cadera', values: {} }];
    expect(measuresToExplain(guideWith({ rows }))).toEqual(['waist', 'hips']);
  });

  test('sin medidas estándar en la tabla muestra las cuatro como orientación', () => {
    expect(measuresToExplain(guideWith({ rows: [{ label: 'Largo', values: {} }] }))).toHaveLength(4);
  });
});

test.describe('modelo de referencia', () => {
  const GLOBAL_FIT = { modelHeightCm: 170, topSize: 'S', image: IMG };

  test('sin datos de texto no se muestra, aunque tenga foto', () => {
    expect(visibleFitReference(undefined)).toBeNull();
    expect(visibleFitReference({ image: IMG, topSize: '  ' })).toBeNull();
  });

  test('muestra solo lo cargado y formatea la altura', () => {
    const visible = visibleFitReference({ modelHeightCm: 170, bottomSize: 'S' });
    expect(visible).toEqual({ height: '1,70 m', sizes: [{ label: 'Pantalones y prendas inferiores', value: 'S' }], fit: undefined, notes: undefined });
    expect(formatModelHeight(165)).toBe('1,65 m');
  });

  test('solo publica fotos https', () => {
    expect(visibleFitReference({ fit: 'Ajustado', image: IMG })?.image).toBe(IMG);
    expect(visibleFitReference({ fit: 'Ajustado', image: 'javascript:alert(1)' })?.image).toBeUndefined();
  });

  test('indumentaria usa la general; calzado y productos sin guía no', () => {
    expect(resolveFitReference(guideWith({}), GLOBAL_FIT)).toBe(GLOBAL_FIT);
    expect(resolveFitReference(guideWith({ type: 'calzado' }), GLOBAL_FIT)).toBeUndefined();
    expect(resolveFitReference(undefined, GLOBAL_FIT)).toBeUndefined();
  });

  test('la propia reemplaza a la general y "No mostrar" la oculta', () => {
    const own = { topSize: 'M' };
    expect(resolveFitReference(guideWith({ fitReferenceMode: 'custom', fitReference: own }), GLOBAL_FIT)).toBe(own);
    expect(resolveFitReference(guideWith({ type: 'calzado', fitReferenceMode: 'custom', fitReference: own }), GLOBAL_FIT)).toBe(own);
    expect(resolveFitReference(guideWith({ fitReferenceMode: 'hidden' }), GLOBAL_FIT)).toBeUndefined();
  });
});

test.describe('validación y guardado', () => {
  test('rechaza valores que no son medidas, filas sin nombre y medidas repetidas', () => {
    expect(findGuideProblem(guideWith({ rows: [{ label: 'Busto', values: { S: 'chico' } }] }))).toContain('no es una medida');
    expect(findGuideProblem(guideWith({ rows: [{ label: '', values: { S: '86' } }] }))).toContain('sin nombre');
    const repeated = [{ label: 'Busto', values: {} }, { label: 'busto', values: {} }];
    expect(findGuideProblem(guideWith({ rows: repeated }))).toContain('repetida');
    expect(findGuideProblem(guideWith({ rows: [{ label: 'Busto', values: { S: '86-90' } }] }))).toBeNull();
  });

  test('rechaza altura fuera de rango, foto sin datos o no https y aclaraciones vacías', () => {
    const custom = (fitReference: SizeGuide['fitReference']) => guideWith({ fitReferenceMode: 'custom', fitReference });
    expect(findGuideProblem(custom({ modelHeightCm: 1.7 }))).toContain('centímetros');
    expect(findGuideProblem(custom({ image: IMG }))).toContain('completá al menos');
    expect(findGuideProblem(custom({ topSize: 'S', image: 'http://x.com/a.jpg' }))).toContain('no es una imagen válida');
    expect(findGuideProblem(guideWith({ notes: ['ok', ' '] }))).toContain('vacía');
  });

  test('la estructura precargada sin tocar no genera una guía para guardar', () => {
    expect(hasGuideContent({ type: 'indumentaria', columns: ['S'], rows: defaultMeasureRows('indumentaria') })).toBe(false);
    expect(hasGuideContent({ type: 'indumentaria', rows: [], measurementBasis: 'body' })).toBe(true);
    expect(hasGuideContent({ type: 'indumentaria', rows: [], fitReferenceMode: 'hidden' })).toBe(true);
    expect(hasGuideContent({ type: 'indumentaria', rows: [], fitReference: { topSize: ' ' } })).toBe(false);
  });

  test('cleanGuideInfo recorta textos, quita vacíos y no toca la tabla', () => {
    const guide = guideWith({ notes: [' Una. ', ''], fitReferenceMode: 'custom', fitReference: { topSize: ' S ', fit: '', image: IMG } });
    const cleaned = cleanGuideInfo(guide);
    expect(cleaned.notes).toEqual(['Una.']);
    expect(cleaned.fitReference).toEqual({ topSize: 'S', image: IMG });
    expect(cleaned.rows).toBe(guide.rows);
  });

  test('la modelo propia solo se guarda en modo "Propia"; vacía queda como "No mostrar"', () => {
    expect(cleanGuideInfo(guideWith({ fitReference: { topSize: 'S' } })).fitReference).toBeUndefined();
    const empty = cleanGuideInfo(guideWith({ fitReferenceMode: 'custom', fitReference: { topSize: ' ' } }));
    expect(empty.fitReference).toBeUndefined();
    expect(empty.fitReferenceMode).toBe('hidden');
  });

  test('avisa talles de la guía que el producto no vende', () => {
    expect(guideSizesNotForSale(guideWith({ columns: ['S', 'M', 'XL'] }), ['s', 'M'])).toEqual(['XL']);
    expect(guideSizesNotForSale(guideWith({}), [])).toEqual([]);
  });
});

test.describe('lo general', () => {
  test('sin publicar usa los de por defecto; textos vacíos caen al de por defecto', () => {
    expect(normalizeSizeGuideContent(null)).toEqual(DEFAULT_SIZE_GUIDE_CONTENT);
    const content = normalizeSizeGuideContent({ howToMeasure: { bust: '  ', waist: 'Otra.' }, notes: ['A', ''] });
    expect(content.howToMeasure.bust).toBe(DEFAULT_SIZE_GUIDE_CONTENT.howToMeasure.bust);
    expect(content.howToMeasure.waist).toBe('Otra.');
    expect(content.notes).toEqual(['A']);
  });

  test('una lista de aclaraciones publicada vacía se respeta', () => {
    expect(normalizeSizeGuideContent({ notes: [] }).notes).toEqual([]);
  });

  test('la modelo general se limpia: sin modelo por defecto, altura inválida y fotos no https fuera', () => {
    expect(normalizeSizeGuideContent({}).fitReference).toBeUndefined();
    const content = normalizeSizeGuideContent({
      fitReference: { modelHeightCm: 1.7, topSize: ' S ', image: 'javascript:alert(1)', extra: 'x' },
    });
    expect(content.fitReference).toEqual({ topSize: 'S' });
    expect(normalizeSizeGuideContent({ fitReference: { image: IMG } }).fitReference).toBeUndefined();
  });
});
