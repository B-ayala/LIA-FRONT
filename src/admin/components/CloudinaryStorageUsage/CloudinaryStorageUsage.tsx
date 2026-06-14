'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getAuthToken } from '../../../utils/auth';
import { fetchCloudinaryUsage, type CloudinaryUsage } from '../../../services/productService';
import './CloudinaryStorageUsage.css';

interface StorageUsageProps {
  onRefresh?: () => void;
}

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
        setLoading(false);
        return;
      }

      const usageData = await fetchCloudinaryUsage(token);

      if (!usageData) {
        throw new Error('No se recibieron datos de uso');
      }

      setUsage(usageData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'No se pudo cargar la información de almacenamiento.';
      setError(errorMessage);
      console.error('Cloudinary usage error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsage();
  }, []);

  // Calcular porcentaje de uso de assets (media_count vs media_limit)
  const getUsagePercentage = () => {
    if (!usage || !usage.media_limit || usage.media_limit === 0) return 0;
    return (usage.media_count / usage.media_limit) * 100;
  };

  const getStatusClass = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'normal';
  };

  const percentage = getUsagePercentage();

  return (
    <div className="cloudinary-storage-card admin-card">
      {/* Header */}
      <div className="storage-header">
        <div>
          <h3 className="storage-title">Almacenamiento en Cloudinary</h3>
          <p className="storage-subtitle">
            Monitorea el consumo de tu plan gratuito
          </p>
        </div>
        <button
          className="storage-refresh-btn"
          onClick={() => {
            loadUsage();
            onRefresh?.();
          }}
          disabled={loading}
          title="Actualizar información de almacenamiento"
        >
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      {/* Error message */}
      {error && <div className="storage-error">{error}</div>}

      {/* Loading state */}
      {loading ? (
        <div className="storage-loading">
          <RefreshCw size={18} className="spinning" />
          <span>Cargando información...</span>
        </div>
      ) : usage ? (
        <>
          {/* Alert for high usage */}
          {percentage >= 75 && (
            <div className={`storage-alert storage-alert-${getStatusClass()}`}>
              <AlertTriangle size={16} />
              {percentage >= 90
                ? 'Estás usando casi todo tu límite de recursos. Considera eliminar imágenes no utilizadas.'
                : 'Estás usando más del 75% de tu límite de recursos.'}
            </div>
          )}

          {/* Progress bar */}
          <div className="storage-bar-container">
            <div className={`storage-bar storage-bar-${getStatusClass()}`}>
              <div
                className="storage-bar-fill"
                style={{
                  width: percentage > 0 && percentage < 1 ? '3px' : `${Math.min(percentage, 100)}%`,
                  minWidth: percentage > 0 ? '3px' : '0px',
                }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="storage-stats">
            <div className="storage-stat">
              <span className="storage-stat-label">Usado</span>
              <span className="storage-stat-value">{usage.media_count.toLocaleString()}</span>
            </div>
            <div className="storage-stat-separator">/</div>
            <div className="storage-stat">
              <span className="storage-stat-label">Límite</span>
              <span className="storage-stat-value">{usage.media_limit.toLocaleString()}</span>
            </div>
            <div className="storage-stat storage-stat-percentage">
              <span className="storage-stat-value">{percentage.toFixed(1)}%</span>
            </div>
          </div>

          {/* Info text */}
          <p className="storage-info-text">
            Se muestra el número de recursos (imágenes, videos, etc.) utilizados en tu cuenta.
            El plan gratuito de Cloudinary tiene un límite de {usage.media_limit.toLocaleString()} recursos.
          </p>
        </>
      ) : null}
    </div>
  );
};

export default CloudinaryStorageUsage;
