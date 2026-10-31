import type { VisibleFitReference } from '../../../utils/sizeGuideInfo';
import { buildCloudinaryUrl } from '../../../utils/cloudinary';

interface FitReferenceCardProps {
  fit: VisibleFitReference;
}

// La foto se ve a ~200px de ancho: no hace falta bajar la original.
const PHOTO_SIZE = { width: 480, height: 600, crop: 'fill', gravity: 'auto' } as const;

/** Referencia de calce: solo los datos que el admin cargó. */
const FitReferenceCard = ({ fit }: FitReferenceCardProps) => (
  <section className="size-guide-fit" aria-labelledby="size-guide-fit-title">
    {fit.image && (
      <img className="size-guide-fit__image" src={buildCloudinaryUrl(fit.image, PHOTO_SIZE)} alt="Modelo de referencia" loading="lazy" />
    )}
    <div className="size-guide-fit__body">
      <h3 id="size-guide-fit-title" className="size-guide__title">Referencia de calce</h3>
      {fit.height && <p className="size-guide-fit__height">La modelo mide <strong>{fit.height}</strong>.</p>}
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
      {fit.notes && <p className="size-guide-fit__note">{fit.notes}</p>}
    </div>
  </section>
);

export default FitReferenceCard;
