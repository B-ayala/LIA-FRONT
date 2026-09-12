'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Trash2, Upload, Search, RefreshCw, X, Image,
  FolderPlus, Folder, FolderOpen, ChevronRight, Home,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../../config/supabaseClient';
import { apiFetch, API_BASE_URL } from '../../../utils/apiFetch';
import { getAuthToken } from '../../../utils/auth';
import { useAdminStore } from '../../store/adminStore';
import {
  fetchCloudinaryImages,
  fetchCloudinaryFolders,
  fetchCloudinaryConfig,
  createCloudinaryFolder,
  deleteCloudinaryFolder,
  deleteCloudinaryImage,
  type CloudinaryResource,
  type CloudinaryFolder,
} from '../../../services/productService';
import CloudinaryStorageUsage from '../../components/CloudinaryStorageUsage/CloudinaryStorageUsage';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import './CloudinaryManager.css';

interface ImageUsage {
  products: { id: string; name: string; asMain: boolean }[];
  carousel: boolean;
  about: boolean;
}

const hasUsage = (u: ImageUsage) => u.products.length > 0 || u.carousel || u.about;

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cloudinary: any;
  }
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

// Split path into breadcrumb segments
const buildBreadcrumb = (path: string): { label: string; path: string }[] => {
  if (!path) return [];
  const parts = path.split('/');
  return parts.map((part, i) => ({ label: part, path: parts.slice(0, i + 1).join('/') }));
};

const CloudinaryManager = () => {
  const carouselImages = useAdminStore(s => s.carouselImages);
  const aboutInfo = useAdminStore(s => s.aboutInfo);

  // Folder state
  const [currentFolder, setCurrentFolder] = useState('');
  const [folders, setFolders] = useState<CloudinaryFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<CloudinaryFolder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState('');

  // Image state
  const [images, setImages] = useState<CloudinaryResource[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  // UI state
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteImg, setConfirmDeleteImg] = useState<CloudinaryResource | null>(null);
  const [imageUsage, setImageUsage] = useState<ImageUsage | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [preview, setPreview] = useState<CloudinaryResource | null>(null);
  const [mobileFolderOpen, setMobileFolderOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const getToken = () => getAuthToken().catch(() => '');

  // Load folders at current level
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

  // Load images in current folder
  const loadImages = useCallback(async (folder: string, cursor?: string) => {
    if (!cursor) setImagesLoading(true);
    setError('');
    try {
      const token = await getToken();
      const result = await fetchCloudinaryImages(token, folder || undefined, cursor);
      const resources = result.resources ?? [];
      if (cursor) {
        setImages(prev => [...prev, ...resources]);
      } else {
        setImages(resources);
      }
      setNextCursor(result.next_cursor);
      setHasMore(!!result.next_cursor);
    } catch {
      setError('No se pudieron cargar las imágenes.');
    } finally {
      setImagesLoading(false);
    }
  }, []);

  // Navigate to a folder
  const navigateTo = useCallback((path: string) => {
    setCurrentFolder(path);
    setSearchTerm('');
    setImages([]);
    setMobileFolderOpen(false);
    loadFolders(path);
    loadImages(path);
  }, [loadFolders, loadImages]);

  useEffect(() => {
    navigateTo('');
  }, [navigateTo]);

  // Create folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      const token = await getToken();
      const fullPath = currentFolder ? `${currentFolder}/${name}` : name;
      await createCloudinaryFolder(token, fullPath);
      setNewFolderName('');
      setShowNewFolder(false);
      await loadFolders(currentFolder);
    } catch {
      setError('No se pudo crear la carpeta.');
    } finally {
      setCreatingFolder(false);
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folder: CloudinaryFolder) => {
    setDeletingFolder(folder.path);
    setConfirmDeleteFolder(null);
    try {
      const token = await getToken();
      await deleteCloudinaryFolder(token, folder.path);
      setFolders(prev => prev.filter(f => f.path !== folder.path));
    } catch {
      setError('No se pudo eliminar la carpeta. Asegurate de que esté vacía.');
    } finally {
      setDeletingFolder('');
    }
  };

  // Upload images
  const handleUpload = async () => {
    setUploading(true);
    try {
      const config = await fetchCloudinaryConfig();
      const token = await getToken();
      const targetFolder = currentFolder || 'general';

      window.cloudinary.openUploadWidget(
        {
          cloudName: config.cloudName,
          apiKey: config.apiKey,
          uploadSignature: async (callback: (sig: string, ts: number) => void, paramsToSign: Record<string, unknown>) => {
            const ts = Math.round(Date.now() / 1000);
            const res = await apiFetch(`${API_BASE_URL}/cloudinary/sign`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ source: 'uw', ...paramsToSign, timestamp: ts }),
            });
            const data = await res.json();
            callback(data.data.signature, ts);
          },
          folder: targetFolder,
          sources: ['local', 'url', 'camera'],
          multiple: true,
          resourceType: 'image',
          language: 'es',
        },
        (err: unknown, result: { event: string }) => {
          if (!err && result?.event === 'success') {
            loadImages(currentFolder);
          }
        }
      );
    } catch {
      setError('No se pudo abrir el widget de carga.');
    } finally {
      setUploading(false);
    }
  };

  // Check where an image URL is used across the site
  const checkImageUsage = async (img: CloudinaryResource): Promise<ImageUsage> => {
    const url = img.secure_url;

    // 1. Products: check image_url (primary) and images[] (gallery) in Supabase
    const [{ data: byPrimary }, { data: withGallery }] = await Promise.all([
      supabase.from('productos').select('id, name').eq('image_url', url),
      supabase.from('productos').select('id, name, images').not('images', 'is', null),
    ]);

    const galleryMatches = (withGallery || []).filter(
      (p: { images: unknown }) => Array.isArray(p.images) && (p.images as string[]).includes(url)
    );

    const productMap = new Map<string, { id: string; name: string; asMain: boolean }>();
    for (const p of (byPrimary || [])) {
      productMap.set(p.id, { id: p.id, name: p.name, asMain: true });
    }
    for (const p of galleryMatches) {
      if (!productMap.has(p.id)) {
        productMap.set(p.id, { id: p.id, name: p.name, asMain: false });
      }
    }

    // 2. Carousel (store)
    const inCarousel = carouselImages.some(c => c.url === url);

    // 3. About section (store)
    const inAbout = aboutInfo.imageUrl === url;

    return { products: Array.from(productMap.values()), carousel: inCarousel, about: inAbout };
  };

  // Open delete confirmation: check usage first, then show modal
  const requestDeleteImage = async (img: CloudinaryResource) => {
    setCheckingUsage(true);
    setConfirmDeleteImg(img);
    try {
      const usage = await checkImageUsage(img);
      setImageUsage(usage);
    } catch {
      setImageUsage({ products: [], carousel: false, about: false });
    } finally {
      setCheckingUsage(false);
    }
  };

  // Delete image
  const handleDeleteImage = async (image: CloudinaryResource) => {
    setDeletingId(image.public_id);
    setConfirmDeleteImg(null);
    setImageUsage(null);
    try {
      const token = await getToken();
      await deleteCloudinaryImage(image.public_id, token);
      setImages(prev => prev.filter(img => img.public_id !== image.public_id));
    } catch {
      setError('No se pudo eliminar la imagen.');
    } finally {
      setDeletingId(null);
    }
  };

  const closeDeleteModal = () => {
    setConfirmDeleteImg(null);
    setImageUsage(null);
  };

  const breadcrumb = buildBreadcrumb(currentFolder);

  const filteredImages = images.filter(img =>
    img.public_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="cloudinary-page">
      {/* Page header */}
      <div className="cloudinary-page-header">
        <div>
          <h1 className="admin-page-title">Cloudinary</h1>
          <p className="admin-page-subtitle">Gestioná carpetas e imágenes de tu cuenta.</p>
        </div>
        <div className="cloudinary-header-actions">
          <button
            className="cld-btn-secondary admin-flex-center gap-2 cld-mobile-folders-btn"
            onClick={() => setMobileFolderOpen(o => !o)}
          >
            <Folder size={15} /> Carpetas
          </button>
          <button
            className="cld-btn-secondary admin-flex-center gap-2"
            onClick={() => { loadFolders(currentFolder); loadImages(currentFolder); }}
            disabled={imagesLoading}
          >
            <RefreshCw size={15} className={imagesLoading ? 'spinning' : ''} />
            Actualizar
          </button>
          <button className="admin-btn-primary admin-flex-center gap-2" onClick={handleUpload} disabled={uploading}>
            {uploading
              ? <LiaLoader size="xs" />
              : <Upload size={15} />}
            {uploading ? 'Abriendo...' : 'Subir imagen'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="cloudinary-error">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* Storage usage bar */}
      <CloudinaryStorageUsage onRefresh={() => loadImages(currentFolder)} />

      <div className="cloudinary-layout">
        {/* ── Folder sidebar ── */}
        <aside className={`cloudinary-sidebar ${mobileFolderOpen ? 'mobile-open' : ''}`}>
          <div className="cld-sidebar-header">
            <span className="cld-sidebar-title">Carpetas</span>
            <button
              className="cld-new-folder-btn"
              onClick={() => setShowNewFolder(v => !v)}
              title="Nueva carpeta"
            >
              <FolderPlus size={16} />
            </button>
          </div>

          {/* New folder form */}
          {showNewFolder && (
            <form className="cld-new-folder-form" onSubmit={handleCreateFolder}>
              <input
                autoFocus
                type="text"
                placeholder={currentFolder ? `Subcarpeta en "${currentFolder.split('/').pop()}"` : 'Nombre de carpeta'}
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                disabled={creatingFolder}
              />
              <div className="cld-new-folder-actions">
                <button type="submit" className="admin-btn-primary" disabled={creatingFolder || !newFolderName.trim()}>
                  {creatingFolder ? <LiaLoader size="xs" /> : 'Crear'}
                </button>
                <button type="button" className="cld-btn-secondary" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Root / All images */}
          <button
            className={`cld-folder-item cld-folder-all ${currentFolder === '' ? 'active' : ''}`}
            onClick={() => navigateTo('')}
          >
            <Home size={15} />
            <span>Todas las imágenes</span>
          </button>

          {/* Folder list */}
          {foldersLoading ? (
            <div className="cld-folders-loading"><LiaLoader size="sm" /></div>
          ) : folders.length === 0 ? (
            <p className="cld-folders-empty">Sin carpetas</p>
          ) : (
            <ul className="cld-folder-list">
              {folders.map(f => (
                <li key={f.path} className="cld-folder-row">
                  <button
                    className={`cld-folder-item ${currentFolder === f.path ? 'active' : ''}`}
                    onClick={() => navigateTo(f.path)}
                  >
                    {currentFolder === f.path ? <FolderOpen size={15} /> : <Folder size={15} />}
                    <span title={f.name}>{f.name}</span>
                  </button>
                  <button
                    className="cld-folder-delete"
                    onClick={() => setConfirmDeleteFolder(f)}
                    disabled={deletingFolder === f.path}
                    title="Eliminar carpeta"
                  >
                    {deletingFolder === f.path
                      ? <LiaLoader size="xs" />
                      : <Trash2 size={12} />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Back up one level if inside a folder */}
          {currentFolder && (
            <button
              className="cld-go-up-btn"
              onClick={() => {
                const parent = currentFolder.includes('/')
                  ? currentFolder.split('/').slice(0, -1).join('/')
                  : '';
                navigateTo(parent);
              }}
            >
              ↑ Subir un nivel
            </button>
          )}
        </aside>

        {/* ── Image panel ── */}
        <div className="cloudinary-main">
          {/* Breadcrumb */}
          <div className="cld-breadcrumb">
            <button className="cld-crumb" onClick={() => navigateTo('')}>
              <Home size={13} /> Inicio
            </button>
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.path} className="cld-crumb-group">
                <ChevronRight size={13} className="cld-crumb-sep" />
                <button
                  className={`cld-crumb ${i === breadcrumb.length - 1 ? 'active' : ''}`}
                  onClick={() => navigateTo(crumb.path)}
                >
                  {crumb.label}
                </button>
              </span>
            ))}
            {!imagesLoading && (
              <span className="cld-breadcrumb-count">
                {filteredImages.length} imagen{filteredImages.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>

          {/* Search */}
          <div className="cld-search-bar">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="search-clear" onClick={() => setSearchTerm('')}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="cloudinary-grid-card admin-card">
            {imagesLoading ? (
              <div className="cloudinary-loading">
                <LiaLoader size="md" />
                <span>Cargando imágenes...</span>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="cloudinary-empty">
                <Image size={36} />
                <p>{searchTerm ? 'Sin resultados.' : 'Esta carpeta está vacía.'}</p>
              </div>
            ) : (
              <div className="cloudinary-grid">
                {filteredImages.map(img => (
                  <div key={img.public_id} className="cloudinary-card">
                    <div className="cloudinary-img-wrap" onClick={() => setPreview(img)}>
                      <img src={img.secure_url} alt={img.public_id} loading="lazy" />
                      <div className="cloudinary-img-overlay"><span>Ver</span></div>
                    </div>
                    <div className="cloudinary-card-info">
                      <p className="cloudinary-card-name" title={img.public_id}>
                        {img.public_id.split('/').pop()}
                      </p>
                      <p className="cloudinary-card-meta">
                        {img.format.toUpperCase()} · {formatBytes(img.bytes)} · {img.width}×{img.height}
                      </p>
                      <p className="cloudinary-card-date">{formatDate(img.created_at)}</p>
                    </div>
                    <button
                      className="cloudinary-delete-btn"
                      onClick={() => requestDeleteImage(img)}
                      disabled={deletingId === img.public_id}
                      title="Eliminar imagen"
                    >
                      {deletingId === img.public_id
                        ? <LiaLoader size="xs" />
                        : <Trash2 size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {hasMore && !imagesLoading && (
              <div className="cloudinary-load-more">
                <button className="cld-btn-secondary" onClick={() => loadImages(currentFolder, nextCursor)}>
                  Cargar más imágenes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirm delete folder ── */}
      {confirmDeleteFolder && (
        <div className="cloudinary-modal-overlay" onClick={() => setConfirmDeleteFolder(null)}>
          <div className="cloudinary-confirm-modal" onClick={e => e.stopPropagation()}>
            <Folder size={32} style={{ color: '#f59e0b' }} />
            <h3>¿Eliminar carpeta?</h3>
            <p className="cloudinary-confirm-name">{confirmDeleteFolder.path}</p>
            <p className="cloudinary-confirm-warning">
              Solo se puede eliminar si está vacía. Esta acción no se puede deshacer.
            </p>
            <div className="cloudinary-confirm-actions">
              <button className="cld-btn-secondary" onClick={() => setConfirmDeleteFolder(null)}>Cancelar</button>
              <button className="admin-btn-danger" onClick={() => handleDeleteFolder(confirmDeleteFolder)}>
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete image ── */}
      {confirmDeleteImg && (
        <div className="cloudinary-modal-overlay" onClick={closeDeleteModal}>
          <div className="cloudinary-confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>¿Eliminar imagen?</h3>
            <img src={confirmDeleteImg.secure_url} alt={confirmDeleteImg.public_id} className="cloudinary-confirm-preview" />
            <p className="cloudinary-confirm-name">{confirmDeleteImg.public_id.split('/').pop()}</p>

            {/* Usage check result */}
            {checkingUsage ? (
              <div className="cld-usage-checking">
                <LiaLoader size="sm" />
                <span>Verificando usos...</span>
              </div>
            ) : imageUsage && hasUsage(imageUsage) ? (
              <div className="cld-usage-warning">
                <div className="cld-usage-warning-header">
                  <AlertTriangle size={16} />
                  <span>Esta imagen está siendo usada en:</span>
                </div>
                <ul className="cld-usage-list">
                  {imageUsage.products.map(p => (
                    <li key={p.id} className="cld-usage-item">
                      <span className="cld-usage-dot" />
                      <span>
                        <strong>Producto:</strong> {p.name}
                        {p.asMain ? ' (imagen principal)' : ' (galería)'}
                      </span>
                    </li>
                  ))}
                  {imageUsage.carousel && (
                    <li className="cld-usage-item">
                      <span className="cld-usage-dot" />
                      <span><strong>Carrusel</strong> de la página de inicio</span>
                    </li>
                  )}
                  {imageUsage.about && (
                    <li className="cld-usage-item">
                      <span className="cld-usage-dot" />
                      <span>Sección <strong>Acerca de</strong></span>
                    </li>
                  )}
                </ul>
                <p className="cld-usage-risk">
                  Si la eliminás, esas secciones quedarán sin imagen.
                </p>
              </div>
            ) : (
              <p className="cloudinary-confirm-warning">Esta acción es permanente y no se puede deshacer.</p>
            )}

            <div className="cloudinary-confirm-actions">
              <button className="cld-btn-secondary" onClick={closeDeleteModal}>Cancelar</button>
              <button
                className={`admin-btn-danger ${imageUsage && hasUsage(imageUsage) ? 'danger-strong' : ''}`}
                onClick={() => handleDeleteImage(confirmDeleteImg)}
                disabled={checkingUsage}
              >
                <Trash2 size={14} />
                {imageUsage && hasUsage(imageUsage) ? 'Eliminar de todas formas' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image preview ── */}
      {preview && (
        <div className="cloudinary-modal-overlay" onClick={() => setPreview(null)}>
          <div className="cloudinary-preview-modal" onClick={e => e.stopPropagation()}>
            <button className="cloudinary-preview-close" onClick={() => setPreview(null)}>
              <X size={18} />
            </button>
            <img src={preview.secure_url} alt={preview.public_id} />
            <div className="cloudinary-preview-info">
              <p className="cloudinary-preview-id">{preview.public_id}</p>
              <div className="cloudinary-preview-meta">
                <span>{preview.format.toUpperCase()}</span>
                <span>{formatBytes(preview.bytes)}</span>
                <span>{preview.width}×{preview.height}px</span>
                <span>{formatDate(preview.created_at)}</span>
              </div>
              <button
                className="cloudinary-preview-copy"
                onClick={() => navigator.clipboard.writeText(preview.secure_url)}
              >
                Copiar URL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudinaryManager;
