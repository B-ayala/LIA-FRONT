import { useState, useEffect, useCallback } from 'react';
import {
  X, RefreshCw, Home, Folder, FolderOpen, ChevronRight,
} from 'lucide-react';
import { getAuthToken } from '../../../utils/auth';
import {
  fetchCloudinaryImages,
  fetchCloudinaryFolders,
  type CloudinaryResource,
  type CloudinaryFolder,
} from '../../../services/productService';
import './CloudinaryImagePicker.css';

interface CloudinaryImagePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
}

const CloudinaryImagePicker = ({ open, onClose, onSelect }: CloudinaryImagePickerProps) => {
  const [currentFolder, setCurrentFolder] = useState('');
  const [folders, setFolders] = useState<CloudinaryFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [images, setImages] = useState<CloudinaryResource[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const getToken = async () => {
    try {
      return await getAuthToken();
    } catch {
      return '';
    }
  };

  const loadFolders = useCallback(async (path: string) => {
    setFoldersLoading(true);
    try {
      const token = await getToken();
      const result = await fetchCloudinaryFolders(token, path || undefined);
      setFolders(result);
    } catch {
      setError('No se pudieron cargar las carpetas.');
    } finally {
      setFoldersLoading(false);
    }
  }, []);

  const loadImages = useCallback(async (folder: string, cursor?: string) => {
    if (!cursor) setImagesLoading(true);
    setError('');
    try {
      const token = await getToken();
      const result = await fetchCloudinaryImages(token, folder || undefined, cursor);
      if (cursor) {
        setImages(prev => [...prev, ...result.resources]);
      } else {
        setImages(result.resources);
      }
      setNextCursor(result.next_cursor);
      setHasMore(!!result.next_cursor);
    } catch {
      setError('No se pudieron cargar las imágenes.');
    } finally {
      setImagesLoading(false);
    }
  }, []);

  const navigateTo = useCallback((path: string) => {
    setCurrentFolder(path);
    setImages([]);
    loadFolders(path);
    loadImages(path);
  }, [loadFolders, loadImages]);

  useEffect(() => {
    if (open) {
      navigateTo('');
      setSelected(new Set());
      setError('');
    }
  }, [open, navigateTo]);

  const toggleSelect = (url: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onSelect([...selected]);
    onClose();
  };


  const breadcrumb = currentFolder.split('/').filter(Boolean);

  if (!open) return null;

  return (
    <div className="cip-overlay" onClick={onClose}>
      <div className="cip-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="cip-header">
          <h3 className="cip-title">Seleccionar imágenes</h3>
          <button
            className="cip-close"
            onClick={onClose}
            title="Cerrar selector"
            aria-label="Cerrar selector de imágenes"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="cip-body">
          {/* Sidebar de carpetas */}
          <aside className="cip-sidebar">
            <div className="cip-sidebar-header">Carpetas</div>

            {/* Raíz */}
            <button
              className={`cip-folder-btn ${currentFolder === '' ? 'active' : ''}`}
              onClick={() => navigateTo('')}
              title="Todas las imágenes"
            >
              <Home size={14} />
              <span>Inicio</span>
            </button>

            {/* Lista de carpetas */}
            {foldersLoading ? (
              <div className="cip-folders-loading">
                <RefreshCw size={12} className="spinning" />
              </div>
            ) : folders.length === 0 ? (
              <p className="cip-folders-empty">Sin carpetas</p>
            ) : (
              <ul className="cip-folder-list">
                {folders.map(f => (
                  <li key={f.path}>
                    <button
                      className={`cip-folder-btn ${currentFolder === f.path ? 'active' : ''}`}
                      onClick={() => navigateTo(f.path)}
                      title={f.name}
                    >
                      {currentFolder === f.path ? (
                        <FolderOpen size={14} />
                      ) : (
                        <Folder size={14} />
                      )}
                      <span>{f.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Botón volver a carpeta anterior */}
            {currentFolder && (
              <button
                className="cip-go-up-btn"
                onClick={() => {
                  const parent = currentFolder.includes('/')
                    ? currentFolder.split('/').slice(0, -1).join('/')
                    : '';
                  navigateTo(parent);
                }}
                title="Volver a la carpeta anterior"
              >
                ← Atrás
              </button>
            )}
          </aside>

          {/* Main: Grid de imágenes */}
          <div className="cip-main">
            {/* Breadcrumb */}
            {breadcrumb.length > 0 && (
              <div className="cip-breadcrumb">
                <button className="cip-crumb" onClick={() => navigateTo('')}>
                  <Home size={12} />
                </button>
                {breadcrumb.map((part, i) => {
                  const path = breadcrumb.slice(0, i + 1).join('/');
                  return (
                    <span key={path} className="cip-crumb-sep">
                      <ChevronRight size={12} />
                      <button className="cip-crumb" onClick={() => navigateTo(path)}>
                        {part}
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="cip-error">
                <span>{error}</span>
                <button onClick={() => setError('')} className="cip-error-close">
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Grid */}
            {imagesLoading ? (
              <div className="cip-loading">
                <RefreshCw size={20} className="spinning" />
                <span>Cargando imágenes...</span>
              </div>
            ) : images.length === 0 ? (
              <div className="cip-empty">
                <span>Esta carpeta está vacía.</span>
              </div>
            ) : (
              <>
                <div className="cip-grid">
                  {images.map(img => {
                    const isSelected = selected.has(img.secure_url);
                    return (
                      <div
                        key={img.public_id}
                        className={`cip-thumb ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSelect(img.secure_url)}
                        title={img.public_id}
                      >
                        <img src={img.secure_url} alt={img.public_id} loading="lazy" />
                        {isSelected && <div className="cip-check">✓</div>}
                      </div>
                    );
                  })}
                </div>

                {hasMore && !imagesLoading && (
                  <button
                    className="cip-load-more"
                    onClick={() => loadImages(currentFolder, nextCursor)}
                  >
                    Cargar más imágenes
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="cip-footer">
          <span className="cip-count">
            {selected.size} imagen{selected.size !== 1 ? 'es' : ''} seleccionada{selected.size !== 1 ? 's' : ''}
          </span>
          <div className="cip-actions">
            <button
              className="cld-btn-secondary"
              onClick={onClose}
              aria-label="Cancelar selección"
            >
              Cancelar
            </button>
            <button
              className="admin-btn-primary"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              aria-label={`Agregar ${selected.size} imagen${selected.size !== 1 ? 's' : ''} seleccionada${selected.size !== 1 ? 's' : ''}`}
            >
              Agregar ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudinaryImagePicker;
