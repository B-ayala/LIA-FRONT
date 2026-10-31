import type { StandardMeasure } from '../../../types/sizeGuideContent';
import { STANDARD_MEASURES } from '../../../utils/sizeGuideInfo';

interface MeasureFigureProps {
  /** Medidas a señalar; las demás no se dibujan. */
  measures: StandardMeasure[];
}

/*
 * Ilustración propia (sin licencias de terceros): no hay un ícono de librería que muestre dónde se
 * toma cada medida, que es justamente lo que la figura tiene que explicar. Los contornos son
 * elipses punteadas porque las medidas se toman alrededor del cuerpo; la entrepierna es vertical.
 */
const BODY_PATH = 'M92,68 C84,72 70,74 64,84 C62,110 66,130 72,150 C76,165 76,172 74,180 C66,200 62,214 64,230 L70,330 L74,420 L90,420 L94,330 L98,252 L102,252 L106,330 L110,420 L126,420 L130,330 L136,230 C138,214 134,200 126,180 C124,172 124,165 128,150 C134,130 138,110 136,84 C130,74 116,72 108,68 Z';
const LEFT_ARM_PATH = 'M64,84 C56,92 52,120 50,150 L46,232 L54,234 L60,160 C62,140 64,122 66,110 Z';
const RIGHT_ARM_PATH = 'M136,84 C144,92 148,120 150,150 L154,232 L146,234 L140,160 C138,140 136,122 134,110 Z';

const LABEL_X = 168;

interface Ring {
  cy: number;
  rx: number;
  labelY: number;
}

const RINGS: Partial<Record<StandardMeasure, Ring>> = {
  bust: { cy: 116, rx: 37, labelY: 112 },
  waist: { cy: 172, rx: 26, labelY: 168 },
  hips: { cy: 218, rx: 37, labelY: 222 },
};

const labelOf = (measure: StandardMeasure): string =>
  STANDARD_MEASURES.find(({ key }) => key === measure)?.label ?? measure;

const MeasureFigure = ({ measures }: MeasureFigureProps) => {
  const description = `Ilustración de un cuerpo que señala dónde se toma cada medida: ${measures.map(labelOf).join(', ')}.`;

  return (
    <svg className="measure-figure" viewBox="0 0 240 430" role="img" aria-label={description}>
      <circle className="measure-figure__body" cx="100" cy="36" r="20" />
      <path className="measure-figure__body" d="M93,54 L93,70 L107,70 L107,54 Z" />
      <path className="measure-figure__body" d={LEFT_ARM_PATH} />
      <path className="measure-figure__body" d={RIGHT_ARM_PATH} />
      <path className="measure-figure__body" d={BODY_PATH} />

      {measures.map((measure) => {
        const ring = RINGS[measure];
        if (!ring) return null;
        return (
          <g key={measure}>
            <ellipse className="measure-figure__line" cx="100" cy={ring.cy} rx={ring.rx} ry="5" />
            <line className="measure-figure__leader" x1={100 + ring.rx} y1={ring.cy} x2={LABEL_X - 4} y2={ring.labelY} />
            <circle className="measure-figure__dot" cx={100 + ring.rx} cy={ring.cy} r="3" />
            <text className="measure-figure__label" x={LABEL_X} y={ring.labelY + 4}>{labelOf(measure)}</text>
          </g>
        );
      })}

      {measures.includes('inseam') && (
        <g>
          <line className="measure-figure__line" x1="97" y1="256" x2="91" y2="412" />
          <circle className="measure-figure__dot" cx="97" cy="256" r="3" />
          <circle className="measure-figure__dot" cx="91" cy="412" r="3" />
          <line className="measure-figure__leader" x1="94" y1="330" x2={LABEL_X - 4} y2="330" />
          <text className="measure-figure__label" x={LABEL_X} y="334">{labelOf('inseam')}</text>
        </g>
      )}
    </svg>
  );
};

export default MeasureFigure;
