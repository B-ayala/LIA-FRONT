import { memo } from 'react';
import {
  RefreshCw, ArrowUp, ArrowDown, Minus, Mail, CheckCircle2, ChevronRight,
} from 'lucide-react';
import type {
  Insight, InsightColumn, InsightMetric, InsightRow, InsightTable,
} from './assistant.types';
import {
  formatCurrency, formatNumber, formatAge, formatTime, formatDate, formatMethod,
  formatOrigin, formatGeneratedAt,
} from './insightFormatters';

/** Tono visual del badge de respuesta del nudge post-WhatsApp. */
const originTone = (value: unknown): string => {
  if (value === 'wa_confirmado') return 'ok';
  if (value === 'wa_sin_confirmar') return 'warn';
  if (value === 'wa_abandonado') return 'idle';
  return 'idle';
};

interface InsightCardProps {
  insight: Insight;
  onNavigate: (to: string) => void;
  onRefresh: () => void;
}

const stockTone = (value: number): string => (value <= 0 ? 'out' : 'low');

/** Texto plano para formatos escalares (los visuales se renderizan aparte). */
const formatScalar = (format: InsightColumn['format'], value: InsightRow[string]): string => {
  switch (format) {
    case 'currency': return formatCurrency(value);
    case 'number': return formatNumber(value);
    case 'age': return formatAge(value);
    case 'time': return formatTime(value);
    case 'date': return formatDate(value);
    case 'method': return formatMethod(value);
    case 'origin': return formatOrigin(value);
    default: return value == null || value === '' ? '—' : String(value);
  }
};

const CellValue = ({ format, value }: { format: InsightColumn['format']; value: InsightRow[string] }) => {
  if (format === 'stock') {
    const n = Number(value) || 0;
    return <span className={`stock-badge ${stockTone(n)}`}>{n}</span>;
  }
  if (format === 'origin') {
    return <span className={`origin-badge ${originTone(value)}`}>{formatOrigin(value)}</span>;
  }
  if (format === 'delta') {
    const n = Number(value) || 0;
    const dir = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
    const Icon = n > 0 ? ArrowUp : n < 0 ? ArrowDown : Minus;
    return (
      <span className={`assistant-delta ${dir}`}>
        <Icon size={13} aria-hidden="true" />
        {n === 0 ? '=' : formatNumber(Math.abs(n))}
      </span>
    );
  }
  return <>{formatScalar(format, value)}</>;
};

const MetricBadge = ({ metric }: { metric: InsightMetric }) => (
  <div className={`assistant-metric tone-${metric.tone ?? 'info'}`}>
    <span className="assistant-metric-value">
      <CellValue format={metric.format} value={metric.value} />
    </span>
    <span className="assistant-metric-label">{metric.label}</span>
  </div>
);

const buildMailto = (table: InsightTable, row: InsightRow): string | null => {
  const action = table.rowAction;
  if (!action) return null;
  const email = row[action.emailKey];
  if (!email) return null;
  const subject = action.subjectField ? row[action.subjectField] : '';
  const body = 'Hola, te escribimos por tu pedido en Damiana Bella.';
  return `mailto:${email}?subject=${encodeURIComponent(`Tu pedido: ${subject ?? ''}`)}&body=${encodeURIComponent(body)}`;
};

const ResultRow = ({ table, row }: { table: InsightTable; row: InsightRow }) => {
  const primary =
    table.columns.find((c) => c.format === 'bar' || c.format === 'text') ?? table.columns[0];
  const rankCol = table.columns.find((c) => c.key === 'rank');
  const metaCols = table.columns.filter((c) => c !== primary && c.key !== 'rank');
  const mailto = buildMailto(table, row);

  return (
    <li className="assistant-row">
      <div className="assistant-row-main">
        {rankCol && <span className="assistant-rank">{formatNumber(row[rankCol.key])}</span>}
        <div className="assistant-row-primary">
          <span className="assistant-row-title">{formatScalar('text', row[primary.key])}</span>
          {primary.format === 'bar' && (
            <span className="assistant-bar" aria-hidden="true">
              <span className="assistant-bar-fill" style={{ width: `${Number(row.barPct) || 0}%` }} />
            </span>
          )}
        </div>
        {mailto && (
          <a className="assistant-row-action" href={mailto} title={table.rowAction?.label}>
            <Mail size={15} aria-hidden="true" />
            <span className="sr-only">{table.rowAction?.label}</span>
          </a>
        )}
      </div>
      <div className="assistant-row-meta">
        {metaCols.map((col) => (
          <span key={col.key} className="assistant-chip">
            <em>{col.label}</em>
            <CellValue format={col.format} value={row[col.key]} />
          </span>
        ))}
      </div>
    </li>
  );
};

const InsightCard = ({ insight, onNavigate, onRefresh }: InsightCardProps) => {
  const isEmpty = !insight.table || insight.table.rows.length === 0;

  return (
    <article className={`assistant-card severity-${insight.severity}`}>
      <header className="assistant-card-head">
        <span className="assistant-severity-dot" aria-hidden="true" />
        <h3 className="assistant-card-title">{insight.title}</h3>
        <button type="button" className="assistant-refresh" onClick={onRefresh} aria-label="Actualizar consulta">
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      </header>

      <div className="assistant-metrics">
        {insight.metrics.map((metric) => (
          <MetricBadge key={metric.label} metric={metric} />
        ))}
      </div>

      {isEmpty ? (
        <div className="assistant-empty">
          <CheckCircle2 size={28} aria-hidden="true" />
          <p>{insight.emptyText}</p>
        </div>
      ) : (
        <ul className="assistant-rows">
          {insight.table!.rows.map((row, index) => (
            <ResultRow key={String(row.id ?? index)} table={insight.table!} row={row} />
          ))}
        </ul>
      )}

      <footer className="assistant-card-foot">
        <span className="assistant-stamp">Actualizado {formatGeneratedAt(insight.generatedAt)}</span>
        <div className="assistant-actions">
          {insight.actions.map((action) =>
            action.type === 'navigate' && action.to ? (
              <button
                key={action.label}
                type="button"
                className="assistant-action-btn"
                onClick={() => onNavigate(action.to as string)}
              >
                {action.label}
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            ) : null
          )}
        </div>
      </footer>
    </article>
  );
};

export default memo(InsightCard);
