import type { VisibleFitReference } from '../../../utils/sizeGuideInfo';

interface FitReferenceCardProps {
  fit: VisibleFitReference;
}

/** Referencia de calce: solo los datos que el admin cargó para este producto. */
const FitReferenceCard = ({ fit }: FitReferenceCardProps) => (
  <section className="size-guide__section size-guide-fit" aria-labelledby="size-guide-fit-title">
    {fit.image && <img className="size-guide-fit__image" src={fit.image} alt="Modelo usando la prenda" loading="lazy" />}
    <div className="size-guide-fit__body">
      <h3 id="size-guide-fit-title" className="size-guide__title">Referencia de calce</h3>
      {fit.height && <p className="size-guide-fit__height">La modelo mide {fit.height}.</p>}
      {fit.sizes.length > 0 && (
        <dl className="size-guide-fit__sizes">
          {fit.sizes.map(({ label, value }) => (
            <div key={label} className="size-guide-fit__size">
              <dt>{label}</dt>
              <dd>usa talle <strong>{value}</strong></dd>
            </div>
          ))}
        </dl>
      )}
      {fit.fit && <p className="size-guide-fit__text"><strong>Calce de la prenda:</strong> {fit.fit}</p>}
      {fit.notes && <p className="size-guide-fit__text">{fit.notes}</p>}
    </div>
  </section>
);

export default FitReferenceCard;
