import type { ReactNode } from 'react';
import SEO from '../../../components/common/SEO/SEO';
import { DEFAULT_TERMS_VERSION } from './termsVersion';
import './LegalPage.css';

// Mientras el abogado no apruebe los textos, cada página avisa que es un borrador.
// Cuando estén aprobados, pasar a false: es el único lugar donde se controla.
const LEGAL_TEXTS_ARE_DRAFT = true;

interface LegalPageProps {
  title: string;
  description: string;
  path: string;
  /** Versión del texto. Los Términos la toman de lo que publica el admin; `null` oculta la versión. */
  version?: string | null;
  /** El texto editable todavía está cargando: se oculta la versión para no mostrar una que cambia. */
  loading?: boolean;
  children: ReactNode;
}

const LegalPage = ({ title, description, path, version = DEFAULT_TERMS_VERSION, loading = false, children }: LegalPageProps) => (
  <main className="legal-page" aria-busy={loading}>
    <SEO title={title} description={description} path={path} />
    <article className="legal-card">
      <h1>{title}</h1>
      {!loading && version !== null && <p className="legal-version">Versión {version}</p>}
      {LEGAL_TEXTS_ARE_DRAFT && (
        <p className="legal-draft" role="note">Borrador para revisión legal. Este texto puede cambiar.</p>
      )}
      {children}
    </article>
  </main>
);

export default LegalPage;
