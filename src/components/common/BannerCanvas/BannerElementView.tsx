import { Link } from 'react-router-dom';
import { buildBannerImageUrl, type BannerElement } from '../../../utils/carouselBanner';

interface BannerElementViewProps {
  element: BannerElement;
  referenceWidth: number;
  // false en el editor: ahí un botón no debe navegar al hacer click.
  interactive: boolean;
}

const EDITOR_EMPTY_TEXT = 'Texto vacío';

const isInternalHref = (href: string): boolean => href.startsWith('/');

const BannerButton = ({ element, interactive }: { element: Extract<BannerElement, { type: 'button' }>; interactive: boolean }) => {
  const style = { background: element.background, color: element.color, fontSize: `${element.fontSize}cqw` };
  const className = 'banner-button';

  if (!interactive || !element.href) {
    return <span className={className} style={style}>{element.label}</span>;
  }
  if (isInternalHref(element.href)) {
    return <Link to={element.href} className={className} style={style}>{element.label}</Link>;
  }
  return (
    <a href={element.href} className={className} style={style} target="_blank" rel="noopener noreferrer">
      {element.label}
    </a>
  );
};

const BannerElementView = ({ element, referenceWidth, interactive }: BannerElementViewProps) => {
  switch (element.type) {
    case 'text':
      return (
        <p
          className={`banner-text banner-font--${element.font}`}
          style={{
            color: element.color,
            fontSize: `${element.fontSize}cqw`,
            fontWeight: element.weight,
            textAlign: element.align,
          }}
        >
          {element.text || (interactive ? '' : EDITOR_EMPTY_TEXT)}
        </p>
      );
    case 'button':
      return <BannerButton element={element} interactive={interactive} />;
    case 'image':
      // Una foto sin elegir solo existe en el editor; al público no se le muestra un hueco.
      if (!element.url && interactive) return null;
      return (
        <div
          className={`banner-photo${element.framed ? ' banner-photo--framed' : ''}`}
          style={{ borderRadius: `${element.radius}%` }}
        >
          {element.url ? (
            <img
              src={buildBannerImageUrl(element.url, element.w, referenceWidth)}
              alt={element.alt}
              draggable={false}
              decoding="async"
            />
          ) : (
            <span className="banner-photo__empty">Sin foto</span>
          )}
        </div>
      );
    case 'line':
      return <div className="banner-line" style={{ background: element.color, height: `${element.thickness}cqw` }} />;
  }
};

export default BannerElementView;
