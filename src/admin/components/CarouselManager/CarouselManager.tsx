import { useState, useEffect } from 'react';
import { Reorder } from 'framer-motion';
import { Trash2, Copy, GripVertical, EyeOff, Eye, Monitor, Smartphone } from 'lucide-react';
import { useAdminStore, type CarouselImage } from '../../store/adminStore';
import {
    fetchAllCarouselImages,
    insertCarouselImage,
    updateCarouselImageDb,
    deleteCarouselImageDb,
    reorderCarouselImages,
} from '../../../services/productService';
import './CarouselManager.css';

const CarouselManager = () => {
    const { carouselImages, setCarouselImages, updateCarouselImage, deleteCarouselImage } = useAdminStore();
    const [newImageUrl, setNewImageUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

    useEffect(() => {
        fetchAllCarouselImages()
            .then(setCarouselImages)
            .catch(() => setError('No se pudieron cargar las imágenes del carrusel.'))
            .finally(() => setLoading(false));
    }, [setCarouselImages]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = newImageUrl.trim();
        if (!url) return;
        setSaving(true);
        setError('');
        try {
            const filteredImages = carouselImages.filter(img => img.deviceType === viewMode);
            const nextOrder = filteredImages.length + 1;
            const newImg = await insertCarouselImage(url, nextOrder, viewMode);
            setCarouselImages([...carouselImages, newImg]);
            setNewImageUrl('');
        } catch {
            setError('No se pudo agregar la imagen.');
        } finally {
            setSaving(false);
        }
    };

    const handleReorder = async (newOrder: CarouselImage[]) => {
        const updated = newOrder.map((img, index) => ({ ...img, order: index + 1 }));
        setCarouselImages(updated);
        try {
            await reorderCarouselImages(updated.map(img => ({ id: img.id, order: img.order })));
        } catch {
            setError('No se pudo guardar el nuevo orden.');
        }
    };

    const handleToggle = async (img: CarouselImage) => {
        const newActive = !img.isActive;
        updateCarouselImage(img.id, { isActive: newActive });
        try {
            await updateCarouselImageDb(img.id, { is_active: newActive });
        } catch {
            updateCarouselImage(img.id, { isActive: img.isActive });
            setError('No se pudo actualizar la imagen.');
        }
    };

    const handleDelete = async (id: string) => {
        deleteCarouselImage(id);
        try {
            await deleteCarouselImageDb(id);
        } catch {
            setError('No se pudo eliminar la imagen.');
        }
    };

    const handleCopy = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setError('');
        } catch {
            setError('No se pudo copiar la URL.');
        }
    };

    const filteredImages = carouselImages.filter(img => img.deviceType === viewMode);
    const imgsPerSlide = viewMode === 'mobile' ? 2 : 3;

    return (
        <div className="admin-card carousel-manager">
            <div className="carousel-manager-header">
                <h2 className="admin-card-title">Gestión de Carrusel</h2>
                <div className="view-mode-toggle">
                    <button
                        type="button"
                        className={`view-mode-btn ${viewMode === 'desktop' ? 'active' : ''}`}
                        onClick={() => setViewMode('desktop')}
                    >
                        <Monitor size={16} /> Desktop
                    </button>
                    <button
                        type="button"
                        className={`view-mode-btn ${viewMode === 'mobile' ? 'active' : ''}`}
                        onClick={() => setViewMode('mobile')}
                    >
                        <Smartphone size={16} /> Mobile
                    </button>
                </div>
            </div>
            <p className="admin-card-desc">
                {viewMode === 'desktop'
                    ? 'Desktop: cada slide muestra 3 imágenes. Se agrupan de 3 en 3 según el orden establecido.'
                    : 'Mobile: cada slide muestra 2 imágenes. Se agrupan de 2 en 2 según el orden establecido.'}
            </p>

            {error && (
                <p style={{ color: 'var(--error, #ef4444)', marginBottom: '12px', fontSize: '14px' }}>{error}</p>
            )}

            <form onSubmit={handleAdd} className="add-carousel-form">
                <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="URL de la nueva imagen..."
                    required
                    disabled={saving}
                />
                <button type="submit" className="admin-btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Añadir Imagen'}
                </button>
            </form>

            {loading ? (
                <div className="empty-state">Cargando imágenes...</div>
            ) : (
                <>
                    {filteredImages.length > 0 && (
                        <div className="slides-summary">
                            <span className="slides-count">
                                {Math.ceil(filteredImages.filter(img => img.isActive).length / imgsPerSlide)} slides activos
                                ({filteredImages.filter(img => img.isActive).length} imágenes activas)
                            </span>
                        </div>
                    )}

                    <Reorder.Group
                        axis="y"
                        values={filteredImages}
                        onReorder={handleReorder}
                        className="carousel-list"
                    >
                        {filteredImages.map((img, index) => {
                            const slideNumber = Math.floor(index / imgsPerSlide) + 1;
                            const positionInSlide = (index % imgsPerSlide) + 1;
                            const isFirstInSlide = index % imgsPerSlide === 0;

                            return (
                                <Reorder.Item
                                    key={img.id}
                                    value={img}
                                    className={`carousel-item ${isFirstInSlide ? 'slide-start' : ''}`}
                                >
                                    {isFirstInSlide && (
                                        <div className="slide-indicator">Slide {slideNumber}</div>
                                    )}
                                    <div className="drag-handle">
                                        <GripVertical size={20} />
                                    </div>
                                    <div className="carousel-img-preview">
                                        <img src={img.url} alt={`Slide ${slideNumber} - Img ${positionInSlide}`} />
                                    </div>
                                    <div className="carousel-item-info">
                                        <span className="carousel-order">#{img.order} (Posición {positionInSlide}/{imgsPerSlide})</span>
                                        <button
                                            type="button"
                                            className={`status-toggle ${img.isActive ? 'active' : 'inactive'}`}
                                            onClick={() => handleToggle(img)}
                                        >
                                            {img.isActive ? <><Eye size={16} /> Activa</> : <><EyeOff size={16} /> Inactiva</>}
                                        </button>
                                    </div>
                                    <div className="carousel-item-actions">
                                        <button
                                            type="button"
                                            className="admin-action-btn copy"
                                            onClick={() => handleCopy(img.url)}
                                            title="Copiar URL"
                                        >
                                            <Copy size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-action-btn delete"
                                            onClick={() => handleDelete(img.id)}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </Reorder.Item>
                            );
                        })}
                    </Reorder.Group>

                    {filteredImages.length === 0 && (
                        <div className="empty-state">
                            No hay imágenes {viewMode === 'mobile' ? 'para mobile' : 'para desktop'} en el carrusel.
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CarouselManager;
