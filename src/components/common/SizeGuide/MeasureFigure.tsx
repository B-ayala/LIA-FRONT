import type { StandardMeasure } from '../../../types/sizeGuideContent';
import { STANDARD_MEASURES } from '../../../utils/sizeGuideInfo';

interface MeasureFigureProps {
  /** Medidas a señalar; las demás no se dibujan. */
  measures: StandardMeasure[];
}

/*
 * Ilustración propia (sin licencias de terceros): ningún ícono de librería muestra dónde se toma
 * cada medida. Los contornos son curvas Catmull-Rom precalculadas sobre una silueta centrada en x=0;
 * la ropa interior se recorta con el contorno del cuerpo para no tener que dibujar sus bordes.
 */
const BODY_X = 192;
const LEADER_START_X = 108;

const TORSO = 'M10,66 C13.5,69 10.5,78.8 11,84 C11.5,89.2 10.3,93.7 13,97 C15.7,100.3 21.7,101.8 27,104 C32.3,106.2 40.5,107.2 45,110 C49.5,112.8 53,116.2 54,121 C55,125.8 52.5,133.8 51,139 C49.5,144.2 46.2,146.8 45,152 C43.8,157.2 45.3,163.3 44,170 C42.7,176.7 39,185.3 37,192 C35,198.7 32.2,202.7 32,210 C31.8,217.3 33.3,227 36,236 C38.7,245 46,254.3 48,264 C50,273.7 48.8,282.7 48,294 C47.2,305.3 45,319.3 43,332 C41,344.7 38,359 36,370 C34,381 31.7,389.3 31,398 C30.3,406.7 32,414 32,422 C32,430 32,437 31,446 C30,455 27.7,468 26,476 C24.3,484 21.2,489 21,494 C20.8,499 24.8,502.7 25,506 C25.2,509.3 24.7,512.7 22,514 C19.3,515.3 11.3,516.3 9,514 C6.7,511.7 8,506 8,500 C8,494 8.5,487 9,478 C9.5,469 10.8,455.7 11,446 C11.2,436.3 10.3,428 10,420 C9.7,412 9.3,406.7 9,398 C8.7,389.3 8.7,379.3 8,368 C7.3,356.7 6.3,340.3 5,330 C3.7,319.7 1.7,306 0,306 C-1.7,306 -3.7,319.7 -5,330 C-6.3,340.3 -7.3,356.7 -8,368 C-8.7,379.3 -8.7,389.3 -9,398 C-9.3,406.7 -9.7,412 -10,420 C-10.3,428 -11.2,436.3 -11,446 C-10.8,455.7 -9.5,469 -9,478 C-8.5,487 -8,494 -8,500 C-8,506 -6.7,511.7 -9,514 C-11.3,516.3 -19.3,515.3 -22,514 C-24.7,512.7 -25.2,509.3 -25,506 C-24.8,502.7 -20.8,499 -21,494 C-21.2,489 -24.3,484 -26,476 C-27.7,468 -30,455 -31,446 C-32,437 -32,430 -32,422 C-32,414 -30.3,406.7 -31,398 C-31.7,389.3 -34,381 -36,370 C-38,359 -41,344.7 -43,332 C-45,319.3 -47.2,305.3 -48,294 C-48.8,282.7 -50,273.7 -48,264 C-46,254.3 -38.7,245 -36,236 C-33.3,227 -31.8,217.3 -32,210 C-32.2,202.7 -35,198.7 -37,192 C-39,185.3 -42.7,176.7 -44,170 C-45.3,163.3 -43.8,157.2 -45,152 C-46.2,146.8 -49.5,144.2 -51,139 C-52.5,133.8 -55,125.8 -54,121 C-53,116.2 -49.5,112.8 -45,110 C-40.5,107.2 -32.3,106.2 -27,104 C-21.7,101.8 -15.7,100.3 -13,97 C-10.3,93.7 -11.5,89.2 -11,84 C-10.5,78.8 -13.5,69 -10,66 C-6.5,63 6.5,63 10,66 Z';
const ARM = 'M50,112 C52.3,110.8 56,116.7 58,123 C60,129.3 61,138 62,150 C63,162 63,180.8 64,195 C65,209.2 66.7,222.8 68,235 C69.3,247.2 70.8,259.5 72,268 C73.2,276.5 74.2,280.7 75,286 C75.8,291.3 77,295.3 77,300 C77,304.7 76.3,310.5 75,314 C73.7,317.5 70.8,321.2 69,321 C67.2,320.8 65,317 64,313 C63,309 63.3,302 63,297 C62.7,292 62.8,290.7 62,283 C61.2,275.3 59.5,262.2 58,251 C56.5,239.8 54.7,227.7 53,216 C51.3,204.3 49.5,191.7 48,181 C46.5,170.3 44.7,160.5 44,152 C43.3,143.5 43,136.7 44,130 C45,123.3 47.7,113.2 50,112 Z';
const TOP = 'M-60,141 C-30,130 -12,150 0,150 C12,150 30,130 60,141 L60,178 C30,184 -30,184 -60,178 Z';
const BRIEFS = 'M-60,258 C-20,268 20,268 60,258 L60,288 C34,292 16,300 8,316 L-8,316 C-16,300 -34,292 -60,288 Z';
const HAIR = 'M-21,42 C-24,18 -10,12 0,12 C10,12 24,18 21,42 C17,30 8,24 0,24 C-8,24 -17,30 -21,42 Z';

interface Guide {
  /** Altura de la etiqueta y de la línea guía. */
  y: number;
  /** Punto del cuerpo donde termina la línea (x relativo al centro). */
  endX: number;
}

const GUIDES: Record<Exclude<StandardMeasure, 'inseam'>, Guide> = {
  bust: { y: 158, endX: 45 },
  waist: { y: 210, endX: 32 },
  hips: { y: 268, endX: 48 },
};

const INSEAM = { labelY: 410, fromX: 5, fromY: 312, toX: 16, toY: 490 };

const labelOf = (measure: StandardMeasure): string =>
  STANDARD_MEASURES.find(({ key }) => key === measure)?.label ?? measure;

const Label = ({ y, measure }: { y: number; measure: StandardMeasure }) => (
  <text className="measure-figure__label" x="6" y={y + 4}>{labelOf(measure).toUpperCase()}</text>
);

const MeasureFigure = ({ measures }: MeasureFigureProps) => {
  const description = `Ilustración de un cuerpo que señala dónde se toma cada medida: ${measures.map(labelOf).join(', ')}.`;
  const x = (relative: number) => BODY_X + relative;

  return (
    <svg className="measure-figure" viewBox="0 0 300 530" role="img" aria-label={description}>
      <defs>
        <clipPath id="measure-figure-body">
          <path transform={`translate(${BODY_X},0)`} d={TORSO} />
        </clipPath>
      </defs>

      <g transform={`translate(${BODY_X},0)`}>
        <path className="measure-figure__skin" d={ARM} transform="scale(-1,1)" />
        <path className="measure-figure__skin" d={ARM} />
        <path className="measure-figure__skin" d={TORSO} />
      </g>
      <g clipPath="url(#measure-figure-body)">
        <g transform={`translate(${BODY_X},0)`}>
          <path className="measure-figure__garment" d={TOP} />
          <path className="measure-figure__garment" d={BRIEFS} />
        </g>
      </g>
      <g transform={`translate(${BODY_X},0)`}>
        <path className="measure-figure__strap" d="M-17,103 L-26,141 M17,103 L26,141" />
        <ellipse className="measure-figure__skin" cx="0" cy="46" rx="21" ry="27" />
        <path className="measure-figure__hair" d={HAIR} />
        <circle className="measure-figure__hair" cx="0" cy="11" r="9" />
      </g>

      {(Object.keys(GUIDES) as (keyof typeof GUIDES)[]).filter((measure) => measures.includes(measure)).map((measure) => {
        const { y, endX } = GUIDES[measure];
        return (
          <g key={measure}>
            <line className="measure-figure__line" x1={LEADER_START_X} y1={y} x2={x(endX)} y2={y} />
            <circle className="measure-figure__dot" cx={x(endX)} cy={y} r="3" />
            <Label y={y} measure={measure} />
          </g>
        );
      })}

      {measures.includes('inseam') && (
        <g>
          <line className="measure-figure__line" x1={LEADER_START_X} y1={INSEAM.labelY} x2={x(11)} y2={INSEAM.labelY} />
          <line className="measure-figure__line" x1={x(INSEAM.fromX)} y1={INSEAM.fromY} x2={x(INSEAM.toX)} y2={INSEAM.toY} />
          <circle className="measure-figure__dot" cx={x(INSEAM.fromX)} cy={INSEAM.fromY} r="3" />
          <circle className="measure-figure__dot" cx={x(INSEAM.toX)} cy={INSEAM.toY} r="3" />
          <Label y={INSEAM.labelY} measure="inseam" />
        </g>
      )}
    </svg>
  );
};

export default MeasureFigure;
