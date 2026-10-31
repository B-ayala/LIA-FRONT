import { Link } from 'react-router-dom';
import type { SizeGuide } from '../../../types/product';
import type { SizeGuideContent, StandardMeasure } from '../../../types/sizeGuideContent';
import { useSizeGuideContent } from '../../../hooks/useSizeGuideContent';
import {
  guideTableStatus,
  measuresToExplain,
  MEASUREMENT_BASIS_LABELS,
  resolveFitReference,
  resolveGuideNotes,
  STANDARD_MEASURES,
  UNIT_LABELS,
  visibleFitReference,
  type GuideTableStatus,
} from '../../../utils/sizeGuideInfo';
import VariantTable from '../VariantTable/VariantTable';
import MeasureFigure from './MeasureFigure';
import FitReferenceCard from './FitReferenceCard';
import './SizeGuide.css';

interface SizeGuideViewProps {
  /** undefined = el producto no tiene guía cargada. */
  guide?: SizeGuide;
}

const NO_GUIDE: SizeGuide = { rows: [] };

/** Guía de talles de la tienda: tabla, cómo medirse, aclaraciones y referencia de calce. */
const SizeGuideView = ({ guide }: SizeGuideViewProps) => {
  const { status: contentStatus, content } = useSizeGuideContent();
  const current = guide ?? NO_GUIDE;
  const tableStatus = guideTableStatus(current);
  // Sin guía no se sabe si es indumentaria o calzado: no se explican medidas del cuerpo.
  const measures = guide ? measuresToExplain(guide) : [];
  // Mientras carga lo general no se muestran los textos por defecto: podrían no ser los publicados.
  const loading = contentStatus === 'loading';
  const fit = loading && !guide?.fitReferenceMode ? null : visibleFitReference(resolveFitReference(guide, content.fitReference));
  const notes = loading ? [] : resolveGuideNotes(current, content.notes, tableStatus);

  return (
    <div className="size-guide">
      <SizeTableSection guide={current} status={tableStatus} />
      {measures.length > 0 && <HowToMeasureSection measures={measures} content={content} />}
      {notes.length > 0 && <NotesSection notes={notes} />}
      {fit && <FitReferenceCard fit={fit} />}
    </div>
  );
};

const SizeTableSection = ({ guide, status }: { guide: SizeGuide; status: GuideTableStatus }) => {
  const unit = UNIT_LABELS[guide.unit ?? 'cm'];
  const basis = guide.measurementBasis ? `, ${MEASUREMENT_BASIS_LABELS[guide.measurementBasis]}` : '';

  return (
    <section className="size-guide__section" aria-labelledby="size-guide-table-title">
      <h3 id="size-guide-table-title" className="size-guide__title">Tabla de talles</h3>
      {status === 'empty' ? (
        <p className="size-guide__pending" role="status">
          Las medidas de este producto todavía están pendientes de completar.
          Si necesitás ayuda para elegir tu talle, <Link to="/contact">escribinos</Link>.
        </p>
      ) : (
        <>
          <p className="size-guide__caption">Medidas en {unit}{basis}.</p>
          <VariantTable sizeGuide={guide} />
          {status === 'partial' && (
            <p className="size-guide__pending" role="status">
              Algunas medidas todavía están pendientes de completar.
            </p>
          )}
        </>
      )}
    </section>
  );
};

/** También la usa la vista previa del admin (Talles > Guía de talles). */
export const HowToMeasureSection = ({ measures, content }: { measures: StandardMeasure[]; content: SizeGuideContent }) => (
  <section className="size-guide__section" aria-labelledby="size-guide-howto-title">
    <h3 id="size-guide-howto-title" className="size-guide__title">¿Cómo tomar tus medidas?</h3>
    <div className="size-guide-howto">
      <dl className="size-guide-howto__list">
        {STANDARD_MEASURES.filter(({ key }) => measures.includes(key)).map(({ key, label }) => (
          <div key={key} className="size-guide-howto__item">
            <dt>{label}</dt>
            <dd>{content.howToMeasure[key]}</dd>
          </div>
        ))}
      </dl>
      <MeasureFigure measures={measures} />
    </div>
  </section>
);

export const NotesSection = ({ notes }: { notes: string[] }) => (
  <section className="size-guide__section" aria-labelledby="size-guide-notes-title">
    <h3 id="size-guide-notes-title" className="size-guide__title">Aclaraciones importantes</h3>
    <ul className="size-guide__notes">
      {notes.map((note, index) => <li key={index}>{note}</li>)}
    </ul>
  </section>
);

export default SizeGuideView;
