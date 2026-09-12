'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { getAuthToken } from '../../../utils/auth';
import { fetchCloudinaryUsage, type CloudinaryUsage } from '../../../services/productService';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import './CloudinaryStorageUsage.css';

interface StorageUsageProps {
  onRefresh?: () => void;
}

const WARNING_THRESHOLD = 75;
const CRITICAL_THRESHOLD = 90;

const getStatusClass = (percentage: number) => {
  if (percentage >= CRITICAL_THRESHOLD) return 'critical';
  if (percentage >= WARNING_THRESHOLD) return 'warning';
  return 'normal';
};

const formatCredits = (value: number | undefined | null) => {
  // El consumo no puede ser negativo; la API a veces devuelve ~-0.01 por redondeo.
  const safe = Math.max(0, Number(value) || 0);
  return safe >= 1
    ? safe.toLocaleString('es-AR', { maximumFractionDigits: 1 })
    : safe.toFixed(2);
};

const formatPercentage = (percentage: number) => {
  if (percentage <= 0) return '0%';
  if (percentage < 1) return 'menos del 1%';
  return `${percentage.toFixed(1)}%`;
};

const CloudinaryStorageUsage = ({ onRefresh }: StorageUsageProps) => {
  const [usage, setUsage] = useState<CloudinaryUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsage = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getAuthToken().catch(() => '');

      if (!token) {
        setError('No se pudo obtener autenticación.');
        return;
      }

      const usageData = await fetchCloudinaryUsage(token);

      if (!usageData) {
        throw new Error('No se recibieron datos de uso');
      }

      setUsage(usageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información de uso.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsage();
  }, []);

  // El plan free se mide en créditos mensuales; el porcentaje viene del propio Cloudinary
  // (used_percent) y se recalcula como respaldo si no llegara.
  const getPercentage = () => {
    if (!usage) return 0;
    if (Number(usage.credits_used_percent) > 0) return usage.credits_used_percent;
    if (!usage.credits_limit) return 0;
    return Math.max(0, (Number(usage.credits_used) / usage.credits_limit) * 100);
  };

  const percentage = getPercentage();
  const statusClass = getStatusClass(percentage);
  const fillWidth = percentage > 0 && percentage < 1 ? 2 : Math.min(percentage, 100);

  return (
    <div className="cloudinary-storage-card admin-card">
      {/* Header */}
      <div className="storage-header">
        <div>
          <h3 className="storage-title">Consumo de tu plan</h3>
          <p className="storage-subtitle">
            Cuánto usaste del plan gratuito de Cloudinary este mes
          </p>
        </div>
        <button
          className="storage-refresh-btn"
          onClick={() => {
            loadUsage();
            onRefresh?.();
          }}
          disabled={loading}
          title="Actualizar información de uso"
        >
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      {/* Error message */}
      {error && <div className="storage-error">{error}</div>}

      {/* Loading state */}
      {loading ? (
        <div className="storage-loading">
          <LiaLoader size="sm" />
          <span>Cargando información...</span>
        </div>
      ) : usage ? (
        <>
          {/* Status banner — siempre visible, con lenguaje claro para el admin */}
          {percentage >= WARNING_THRESHOLD ? (
            <div className={`storage-alert storage-alert-${statusClass}`}>
              <AlertTriangle size={16} />
              {percentage >= CRITICAL_THRESHOLD
                ? 'Estás cerca del tope de tu plan. Pronto vas a necesitar el plan pago o liberar imágenes que no uses.'
                : 'Vas usando buena parte de tu plan este mes. Conviene estar atento.'}
            </div>
          ) : (
            <div className="storage-alert storage-alert-ok">
              <CheckCircle2 size={16} />
              Todo en orden: estás muy lejos del tope de tu plan.
            </div>
          )}

          {/* Progress bar: el ancho total es el tope del plan; el relleno, lo consumido */}
          <div className="storage-bar-container">
            <div className={`storage-bar storage-bar-${statusClass}`}>
              <div
                className="storage-bar-fill"
                style={{
                  width: `${fillWidth}%`,
                  minWidth: percentage > 0 ? '4px' : '0px',
                }}
              />
            </div>
            <div className="storage-bar-scale">
              <span>Inicio</span>
              <span>Tope del plan: {formatCredits(usage.credits_limit)} créditos</span>
            </div>
          </div>

          {/* Stats */}
          <div className="storage-stats">
            <div className="storage-stat">
              <span className="storage-stat-label">Usado este mes</span>
              <span className="storage-stat-value">
                {formatCredits(usage.credits_used)} de {formatCredits(usage.credits_limit)} créditos
              </span>
            </div>
            <div className="storage-stat storage-stat-percentage">
              <span className="storage-stat-value">{formatPercentage(percentage)}</span>
            </div>
          </div>

          {/* Info text */}
          <p className="storage-info-text">
            Tu plan gratuito incluye {formatCredits(usage.credits_limit)} créditos por mes, que
            cubren el espacio de las imágenes, las veces que se muestran en la tienda y las
            ediciones automáticas. Mientras la barra no se llene, estás dentro del plan. Hoy tenés{' '}
            {(usage.asset_count ?? 0).toLocaleString('es-AR')}{' '}
            {usage.asset_count === 1 ? 'imagen guardada' : 'imágenes guardadas'}.
          </p>
        </>
      ) : null}
    </div>
  );
};

export default CloudinaryStorageUsage;
