import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Renderiza el texto legal que edita el admin. Formato mínimo, a propósito (sin HTML crudo):
 *   ## Título             → título de sección
 *   ### Pregunta          → subtítulo
 *   - ítem                → lista (todas las líneas del bloque empiezan con "- ")
 *   [texto](/ruta)        → enlace interno
 *   [texto](https://…)    → enlace externo
 * Los bloques se separan con una línea en blanco. Cualquier otro destino de enlace
 * (p. ej. `javascript:`) se muestra como texto plano.
 */

const HEADING_PREFIX = '## ';
const SUBHEADING_PREFIX = '### ';
const LIST_PREFIX = '- ';
const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;

const isInternalPath = (url: string): boolean => url.startsWith('/') && !url.startsWith('//');
const isExternalUrl = (url: string): boolean => /^https:\/\/[^\s]+$/.test(url);

const renderLink = (label: string, url: string, key: number): ReactNode => {
  if (isInternalPath(url)) return <Link key={key} to={url}>{label}</Link>;
  if (isExternalUrl(url)) return <a key={key} href={url} target="_blank" rel="noopener noreferrer">{label}</a>;
  return label;
};

const renderInline = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(renderLink(match[1], match[2], start));
    cursor = start + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
};

const renderBlock = (block: string, index: number): ReactNode => {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  if (lines.length === 1 && lines[0].startsWith(SUBHEADING_PREFIX)) {
    return <h3 key={index}>{renderInline(lines[0].slice(SUBHEADING_PREFIX.length))}</h3>;
  }
  if (lines.length === 1 && lines[0].startsWith(HEADING_PREFIX)) {
    return <h2 key={index}>{renderInline(lines[0].slice(HEADING_PREFIX.length))}</h2>;
  }
  if (lines.every((line) => line.startsWith(LIST_PREFIX))) {
    return (
      <ul key={index}>
        {lines.map((line, itemIndex) => <li key={itemIndex}>{renderInline(line.slice(LIST_PREFIX.length))}</li>)}
      </ul>
    );
  }
  return <p key={index}>{renderInline(lines.join(' '))}</p>;
};

interface LegalMarkupProps {
  source: string;
}

const LegalMarkup = ({ source }: LegalMarkupProps) => (
  <Fragment>
    {source.replace(/\r\n/g, '\n').split(/\n{2,}/).map(renderBlock)}
  </Fragment>
);

export default LegalMarkup;
