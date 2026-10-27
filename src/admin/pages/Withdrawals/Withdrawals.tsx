import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, Undo2 } from 'lucide-react';
import { Box, MenuItem, Pagination, TextField } from '@mui/material';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import { filterSelectSlotProps } from '../../../utils/labels';
import { ADMIN_PAGE_SIZE, getTotalPages } from '../../../utils/serverPagination';
import {
  WITHDRAWAL_STATUSES,
  WITHDRAWAL_STATUS_LABEL,
  getWithdrawals,
  type Withdrawal,
  type WithdrawalStatus,
} from '../../../services/withdrawalService';
import WithdrawalCard from './WithdrawalCard';
import './Withdrawals.css';

type StatusFilter = WithdrawalStatus | '';

const Withdrawals = () => {
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [pageState, setPageState] = useState({ key: '', page: 1 });
  const requestIdRef = useRef(0);

  // La página queda atada al filtro: al cambiarlo vuelve a 1 sin un fetch intermedio con la vieja.
  const currentPage = pageState.key === statusFilter ? pageState.page : 1;
  const totalPages = getTotalPages(total);

  const load = useCallback(async (showLoader: boolean) => {
    const requestId = ++requestIdRef.current;
    if (showLoader) setLoading(true);
    setFailed(false);
    try {
      const result = await getWithdrawals({
        status: statusFilter,
        limit: ADMIN_PAGE_SIZE,
        offset: (currentPage - 1) * ADMIN_PAGE_SIZE,
      });
      if (requestId !== requestIdRef.current) return;
      setRows(result.rows);
      setTotal(result.total);
    } catch {
      if (requestId === requestIdRef.current) setFailed(true);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [statusFilter, currentPage]);

  useEffect(() => {
    void load(true);
  }, [load]);

  return (
    <div className="admin-withdrawals-page">
      <div className="admin-page-header admin-flex-between">
        <div>
          <h1 className="admin-page-title">Arrepentimientos</h1>
          <p className="admin-page-subtitle">
            Solicitudes del botón de arrepentimiento. Cada una debe gestionarse dentro de las 24 horas.
          </p>
        </div>
        <button className="admin-btn-secondary admin-flex-center gap-2" onClick={() => void load(true)}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      <div className="admin-card withdrawals-toolbar">
        <TextField
          select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          size="small"
          slotProps={filterSelectSlotProps}
          aria-label="Filtrar por estado"
        >
          <MenuItem value="">Todos los estados</MenuItem>
          {WITHDRAWAL_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>{WITHDRAWAL_STATUS_LABEL[status]}</MenuItem>
          ))}
        </TextField>
      </div>

      {loading ? (
        <div className="admin-card sales-empty-state" aria-busy="true">
          <LiaLoader size="md" />
          <p className="sales-empty-subtitle">Cargando solicitudes…</p>
        </div>
      ) : failed ? (
        <div className="admin-card sales-empty-state" role="alert">
          <AlertTriangle size={48} className="sales-empty-icon" />
          <p className="sales-empty-title">No pudimos cargar los arrepentimientos</p>
          <p className="sales-empty-subtitle">Revisá tu conexión e intentá de nuevo.</p>
          <button className="admin-btn-secondary admin-flex-center gap-2" onClick={() => void load(true)}>
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="admin-card sales-empty-state">
          <Undo2 size={48} className="sales-empty-icon" />
          <p className="sales-empty-title">
            {statusFilter ? 'No hay solicitudes con ese estado' : 'Todavía no hay solicitudes'}
          </p>
          <p className="sales-empty-subtitle">
            {statusFilter
              ? 'Probá con otro estado.'
              : 'Cuando un cliente use el botón de arrepentimiento, la solicitud aparece acá.'}
          </p>
        </div>
      ) : (
        <>
          <div className="withdrawals-list">
            {rows.map((withdrawal) => (
              <WithdrawalCard key={withdrawal.id} withdrawal={withdrawal} onSaved={() => void load(false)} />
            ))}
          </div>
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" pt={1} pb={0.5}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setPageState({ key: statusFilter, page })}
                size="small"
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </div>
  );
};

export default Withdrawals;
