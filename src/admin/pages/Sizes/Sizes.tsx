import { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Ruler, RefreshCw, Pencil, Power } from 'lucide-react';
import { MenuItem, TextField } from '@mui/material';
import ConfirmationModal from '../../../components/common/Modal/ConfirmationModal';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import SizeFormModal from '../../components/SizeForm/SizeFormModal';
import { useSizeCatalog } from '../../../hooks/useSizeCatalog';
import { updateSize } from '../../../services/sizeService';
import { filterSelectSlotProps } from '../../../utils/labels';
import { extractErrorMessage } from '../../../utils/errorMessage';
import { listGarments, matchesGarmentFilter, normalizeGarment, NO_GARMENT_FILTER } from '../../../utils/sizeGarment';
import type { Size, SizeType } from '../../../types/size';
import './Sizes.css';

const TYPE_LABELS: Record<SizeType, string> = { indumentaria: 'Indumentaria', calzado: 'Calzado' };

const compareSizes = (a: Size, b: Size): number =>
    a.type.localeCompare(b.type)
    || (normalizeGarment(a.garment) ?? '').localeCompare(normalizeGarment(b.garment) ?? '', 'es')
    || a.name.localeCompare(b.name, 'es', { numeric: true });

const formatMeasurements = (size: Size): string => {
    const entries = Object.entries(size.measurements);
    return entries.length === 0 ? '—' : entries.map(([key, value]) => `${key}: ${value || '—'}`).join(' · ');
};

const garmentLabel = (size: Size): string => normalizeGarment(size.garment) ?? '—';

const StatusPill = ({ active }: { active: boolean }) => (
    <span className={`sizes-pill ${active ? 'sizes-pill--active' : 'sizes-pill--inactive'}`}>
        {active ? 'Activo' : 'Inactivo'}
    </span>
);

type FormTarget = { size: Size | null } | null;

const Sizes = () => {
    const catalog = useSizeCatalog();
    const [filterType, setFilterType] = useState('');
    const [filterGarment, setFilterGarment] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [formTarget, setFormTarget] = useState<FormTarget>(null);
    const [deactivateTarget, setDeactivateTarget] = useState<Size | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

    const hasFilters = Boolean(filterType || filterGarment || filterStatus);
    const rows = useMemo(() => catalog.sizes
        .filter((size) => !filterType || size.type === filterType)
        .filter((size) => matchesGarmentFilter(size, filterGarment))
        .filter((size) => !filterStatus || (filterStatus === 'active') === size.active)
        .sort(compareSizes), [catalog.sizes, filterType, filterGarment, filterStatus]);
    const garments = useMemo(() => listGarments(catalog.sizes), [catalog.sizes]);

    const setActive = async (size: Size, active: boolean) => {
        setBusyId(size.id);
        setNotice(null);
        try {
            await updateSize(size.id, { active });
            catalog.reload();
            setNotice({ kind: 'success', text: active ? `Talle ${size.name} activado.` : `Talle ${size.name} desactivado.` });
        } catch (err) {
            setNotice({ kind: 'error', text: extractErrorMessage(err, 'No pudimos cambiar el estado del talle.') });
        } finally {
            setBusyId(null);
        }
    };

    const handleToggle = (size: Size) => {
        if (size.active) setDeactivateTarget(size);
        else void setActive(size, true);
    };

    const handleSaved = (saved: Size) => {
        setFormTarget(null);
        catalog.reload();
        setNotice({ kind: 'success', text: `Talle ${saved.name} guardado.` });
    };

    const renderActions = (size: Size) => (
        <div className="sizes-actions">
            <button type="button" className="admin-btn-secondary sizes-action-btn" onClick={() => setFormTarget({ size })} aria-label={`Editar talle ${size.name}`}>
                <Pencil size={16} aria-hidden="true" /> Editar
            </button>
            <button
                type="button"
                className="admin-btn-secondary sizes-action-btn"
                disabled={busyId === size.id}
                onClick={() => handleToggle(size)}
                aria-label={`${size.active ? 'Desactivar' : 'Activar'} talle ${size.name}`}
            >
                <Power size={16} aria-hidden="true" /> {size.active ? 'Desactivar' : 'Activar'}
            </button>
        </div>
    );

    const renderBody = () => {
        if (catalog.status === 'loading' || catalog.status === 'idle') {
            return (
                <div className="sizes-state" role="status" aria-live="polite">
                    <LiaLoader size="md" />
                    <p>Cargando talles...</p>
                </div>
            );
        }
        if (catalog.status === 'error') {
            return (
                <div className="sizes-state" role="alert">
                    <AlertTriangle size={40} aria-hidden="true" />
                    <p className="sizes-state__title">No pudimos cargar los talles</p>
                    <p>{catalog.error}</p>
                    <button type="button" className="admin-btn-secondary" onClick={catalog.reload}>
                        <RefreshCw size={16} aria-hidden="true" /> Reintentar
                    </button>
                </div>
            );
        }
        if (rows.length === 0) {
            return (
                <div className="sizes-state">
                    <Ruler size={40} aria-hidden="true" />
                    <p className="sizes-state__title">
                        {hasFilters ? 'No hay talles que coincidan con los filtros' : 'Todavía no hay talles en el catálogo'}
                    </p>
                    <p>
                        {hasFilters
                            ? 'Probá con otros filtros.'
                            : 'Creá tus talles una vez y después elegilos en cada producto.'}
                    </p>
                    {!hasFilters && (
                        <button type="button" className="admin-btn-primary" onClick={() => setFormTarget({ size: null })}>
                            Crear el primer talle
                        </button>
                    )}
                </div>
            );
        }
        return (
            <>
                <ul className="sizes-card-list">
                    {rows.map((size) => (
                        <li className="sizes-card" key={size.id}>
                            <div className="sizes-card__head">
                                <strong className="sizes-card__name">{size.name}</strong>
                                <span className="sizes-card__type">{TYPE_LABELS[size.type]} · Prenda: {garmentLabel(size)}</span>
                                <StatusPill active={size.active} />
                            </div>
                            <p className="sizes-card__measurements">{formatMeasurements(size)}</p>
                            {renderActions(size)}
                        </li>
                    ))}
                </ul>
                <table className="admin-table sizes-table">
                    <thead>
                        <tr>
                            <th scope="col">Talle</th>
                            <th scope="col">Tipo</th>
                            <th scope="col">Prenda</th>
                            <th scope="col">Medidas</th>
                            <th scope="col">Estado</th>
                            <th scope="col">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((size) => (
                            <tr key={size.id}>
                                <td className="font-medium">{size.name}</td>
                                <td>{TYPE_LABELS[size.type]}</td>
                                <td>{garmentLabel(size)}</td>
                                <td className="sizes-table__measurements">{formatMeasurements(size)}</td>
                                <td><StatusPill active={size.active} /></td>
                                <td>{renderActions(size)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </>
        );
    };

    return (
        <div className="admin-sizes-page">
            <div className="admin-page-header admin-flex-between">
                <div>
                    <h1 className="admin-page-title">Talles</h1>
                    <p className="admin-page-subtitle">
                        Catálogo global de talles. Cada producto elige cuáles usar; nada se asigna solo.
                    </p>
                </div>
                <button type="button" className="admin-btn-primary admin-flex-center gap-2" onClick={() => setFormTarget({ size: null })}>
                    <Plus size={16} aria-hidden="true" /> Nuevo talle
                </button>
            </div>

            <div className="admin-card sizes-toolbar">
                <TextField select className="filter-select" aria-label="Filtrar por tipo" value={filterType} onChange={(e) => setFilterType(e.target.value)} size="small" slotProps={filterSelectSlotProps}>
                    <MenuItem value="">Todos los tipos</MenuItem>
                    <MenuItem value="indumentaria">Indumentaria</MenuItem>
                    <MenuItem value="calzado">Calzado</MenuItem>
                </TextField>
                <TextField select className="filter-select" aria-label="Filtrar por prenda" value={filterGarment} onChange={(e) => setFilterGarment(e.target.value)} size="small" slotProps={filterSelectSlotProps}>
                    <MenuItem value="">Todas las prendas</MenuItem>
                    <MenuItem value={NO_GARMENT_FILTER}>Sin prenda</MenuItem>
                    {garments.map((garment) => <MenuItem key={garment} value={garment}>{garment}</MenuItem>)}
                </TextField>
                <TextField select className="filter-select" aria-label="Filtrar por estado" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} size="small" slotProps={filterSelectSlotProps}>
                    <MenuItem value="">Todos los estados</MenuItem>
                    <MenuItem value="active">Activos</MenuItem>
                    <MenuItem value="inactive">Inactivos</MenuItem>
                </TextField>
            </div>

            {notice && (
                <p className={`sizes-notice sizes-notice--${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
                    {notice.text}
                </p>
            )}

            <div className="admin-card table-card">{renderBody()}</div>

            <SizeFormModal
                isOpen={formTarget !== null}
                onClose={() => setFormTarget(null)}
                size={formTarget?.size ?? null}
                onSaved={handleSaved}
                garmentSuggestions={garments}
            />

            <ConfirmationModal
                isOpen={deactivateTarget !== null}
                onClose={() => setDeactivateTarget(null)}
                status="info"
                title="Desactivar talle"
                message={`¿Desactivar el talle "${deactivateTarget?.name ?? ''}"?\n\nNo se podrá agregar a productos nuevos. Los productos que ya lo tienen lo conservan.`}
                actionButtonText="Desactivar"
                cancelButtonText="Cancelar"
                onActionClick={() => { if (deactivateTarget) void setActive(deactivateTarget, false); }}
            />
        </div>
    );
};

export default Sizes;
