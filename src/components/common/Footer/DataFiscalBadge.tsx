import { toArcaHttpsUrl } from '../../../utils/legalFooter';

interface DataFiscalBadgeProps {
  url?: string;
  imageUrl?: string;
}

/**
 * Sello Data Fiscal (ARCA, Formulario 960/D). Se revalida el host al renderizar: aunque el
 * contenido guardado fuera alterado, solo se enlazan dominios oficiales de ARCA/AFIP.
 */
const DataFiscalBadge = ({ url, imageUrl }: DataFiscalBadgeProps) => {
  const safeUrl = url ? toArcaHttpsUrl(url) : null;
  if (!safeUrl) return null;
  const safeImage = imageUrl ? toArcaHttpsUrl(imageUrl) : null;

  return (
    <div className="footer-data-fiscal">
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="footer-data-fiscal-link"
        aria-label="Data Fiscal de ARCA (se abre en una pestaña nueva)"
      >
        {safeImage ? <img src={safeImage} alt="Data Fiscal" height={60} loading="lazy" /> : 'Data Fiscal'}
      </a>
    </div>
  );
};

export default DataFiscalBadge;
