// Tipos del asistente del panel admin. Reflejan el contrato uniforme que expone
// el backend en GET /api/admin/insights/* (ver controllers/insightsController.js).

export type Severity = 'critical' | 'warning' | 'info' | 'ok';

export type CellFormat =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'time'
  | 'age'
  | 'stock'
  | 'method'
  | 'origin'
  | 'delta'
  | 'bar';

export interface InsightMetric {
  label: string;
  value: number | string;
  format: CellFormat;
  tone?: Severity;
}

export interface InsightColumn {
  key: string;
  label: string;
  format: CellFormat;
  align?: 'left' | 'center' | 'right';
}

export interface InsightRowAction {
  kind: 'contact-email';
  label: string;
  emailKey: string;
  subjectField?: string;
}

export type InsightRow = Record<string, string | number | null>;

export interface InsightTable {
  columns: InsightColumn[];
  rows: InsightRow[];
  rowAction?: InsightRowAction;
}

export interface InsightAction {
  type: 'navigate';
  label: string;
  to?: string;
}

export interface Insight {
  id: string;
  title: string;
  generatedAt: string;
  severity: Severity;
  metrics: InsightMetric[];
  table: InsightTable | null;
  actions: InsightAction[];
  emptyText: string;
}

export interface InsightResponse {
  success: boolean;
  insight?: Insight;
  message?: string;
}
