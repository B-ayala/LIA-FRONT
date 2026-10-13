import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { Reorder } from 'framer-motion';
import { Monitor, Smartphone, GalleryHorizontal, Columns3, Check, LayoutTemplate } from 'lucide-react';
import { useAdminStore, type CarouselImage } from '../../store/adminStore';
import {
    fetchAllCarouselImages,
    insertCarouselImage,
    insertCarouselBanner,
    updateCarouselImageDb,
    deleteCarouselImageDb,
    reorderCarouselImages,
    fetchAllCarouselLayouts,
    updateCarouselLayout,
    type CarouselLayout,
} from '../../../services/productService';
import { createStarterDesign, type BannerDesign } from '../../../utils/carouselBanner';
import { groupBySlide, imagesPerSlide } from '../../../utils/carouselSlides';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import CarouselListItem, { type SlidePosition } from './CarouselListItem';
import './CarouselManager.css';

const BannerEditor = lazy(() => import('../BannerEditor/BannerEditor'));
const NavbarColorDialog = lazy(() => import('../NavbarColor/NavbarColorDialog'));
const ConfirmationModal = lazy(() => import('../../../components/common/Modal/ConfirmationModal'));

type DeviceView = 'desktop' | 'mobile';
type EditorState = { mode: 'new' } | { mode: 'edit'; image: CarouselImage } | null;

const MISSING_MIGRATION_CODE = 'PGRST204';
const MISSING_MIGRATION_MESSAGE =
    'La base todavía no tiene las migraciones del carrusel (2026-10-15_add_carousel_banner_slides.sql y 2026-10-16_add_navbar_color_to_carousel_images.sql). Aplicalas en Supabase y reintentá.';

const isMissingColumnError = (error: unknown): boolean =>
    typeof error === 'object' && error !== null && (error as { code?: string }).code === MISSING_MIGRATION_CODE;

// Mensaje que el editor le muestra al admin: solo el caso accionable tiene texto propio.
const toBannerSaveError = (error: unknown): unknown =>
    isMissingColumnError(error) ? new Error(MISSING_MIGRATION_MESSAGE) : error;

const CarouselManager = () => {
    const { carouselImages, setCarouselImages, updateCarouselImage, deleteCarouselImage } = useAdminStore();
    const [newImageUrl, setNewImageUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState<DeviceView>('desktop');
    const [layouts, setLayouts] = useState<Record<DeviceView, CarouselLayout>>({ desktop: 'collage', mobile: 'collage' });
    const [savingLayout, setSavingLayout] = useState(false);
    const [editor, setEditor] = useState<EditorState>(null);
    const [bannerToDelete, setBannerToDelete] = useState<CarouselImage | null>(null);
    const [navbarTarget, setNavbarTarget] = useState<CarouselImage | null>(null);

    useEffect(() => {
        fetchAllCarouselImages()
            .then(setCarouselImages)
            .catch(() => setError('No se pudieron cargar las imágenes del carrusel.'))
            .finally(() => setLoading(false));

        fetchAllCarouselLayouts()
            .then(setLayouts)
            .catch(() => setError('No se pudo cargar el diseño del carrusel.'));
    }, [setCarouselImages]);

    const filteredImages = useMemo(
        () => carouselImages.filter(img => img.deviceType === viewMode),
        [carouselImages, viewMode],
    );
    const currentLayout = layouts[viewMode];
    const imgsPerSlide = imagesPerSlide(currentLayout, viewMode === 'mobile');

    // Los banners ocupan un slide entero: la numeración sale del mismo
    // agrupamiento que usa el carrusel público.
    const slidePositions = useMemo(() => {
        const positions = new Map<string, SlidePosition>();
        groupBySlide(filteredImages, imgsPerSlide).forEach((group, groupIndex) => {
            group.forEach((img, index) => {
                positions.set(img.id, {
                    slideNumber: groupIndex + 1,
                    positionInSlide: index + 1,
                    slideSize: group.length === 1 && img.kind === 'banner' ? 1 : imgsPerSlide,
                    isFirstInSlide: index === 0,
                });
            });
        });
        return positions;
    }, [filteredImages, imgsPerSlide]);

    const activeImages = filteredImages.filter(img => img.isActive);
    const activeSlides = groupBySlide(activeImages, imgsPerSlide).length;

    const handleLayoutChange = async (nextLayout: CarouselLayout) => {
        if (layouts[viewMode] === nextLayout || savingLayout) return;
        const previous = layouts[viewMode];
        setLayouts(prev => ({ ...prev, [viewMode]: nextLayout }));
        setSavingLayout(true);
        setError('');
        try {
            await updateCarouselLayout(viewMode, nextLayout);
        } catch {
            setLayouts(prev => ({ ...prev, [viewMode]: previous }));
            setError('No se pudo guardar el diseño del carrusel.');
        } finally {
            setSavingLayout(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = newImageUrl.trim();
        if (!url) return;
        setSaving(true);
        setError('');
        try {
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

    const handleSaveBanner = async (design: BannerDesign, navbarColor: string | null) => {
        if (!editor) return;
        try {
            if (editor.mode === 'edit') {
                await updateCarouselImageDb(editor.image.id, { design, navbar_color: navbarColor });
                updateCarouselImage(editor.image.id, { design, navbarColor });
            } else {
                const nextOrder = Math.max(0, ...filteredImages.map(img => img.order)) + 1;
                const created = await insertCarouselBanner(design, nextOrder, viewMode, navbarColor);
                setCarouselImages([...carouselImages, created]);
            }
        } catch (saveError) {
            throw toBannerSaveError(saveError);
        }
        setEditor(null);
    };

    const handleSaveNavbarColor = async (color: string | null) => {
        if (!navbarTarget) return;
        try {
            await updateCarouselImageDb(navbarTarget.id, { navbar_color: color });
        } catch (saveError) {
            throw toBannerSaveError(saveError);
        }
        updateCarouselImage(navbarTarget.id, { navbarColor: color });
        setNavbarTarget(null);
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

    const deleteImage = async (id: string) => {
        deleteCarouselImage(id);
        try {
            await deleteCarouselImageDb(id);
        } catch {
            setError('No se pudo eliminar la imagen.');
        }
    };

    // Un banner es trabajo de diseño: se confirma antes de borrarlo.
    const handleDelete = (img: CarouselImage) => {
        if (img.kind === 'banner') {
            setBannerToDelete(img);
        } else {
            void deleteImage(img.id);
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

    const deviceLabel = viewMode === 'desktop' ? 'Desktop' : 'Mobile';

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

            <div className="layout-picker" role="radiogroup" aria-label={`Diseño del carrusel en ${deviceLabel.toLowerCase()}`}>
                <button
                    type="button"
                    role="radio"
                    aria-checked={currentLayout === 'single'}
                    className={`layout-option ${currentLayout === 'single' ? 'active' : ''}`}
                    onClick={() => handleLayoutChange('single')}
                    disabled={savingLayout}
                >
                    <span className="layout-option-icon"><GalleryHorizontal size={22} /></span>
                    <span className="layout-option-text">
                        <span className="layout-option-title">Una imagen por slide {currentLayout === 'single' && <Check size={14} />}</span>
                        <span className="layout-option-desc">Banner ancho, una sola foto ocupa todo el slide. Ideal para fotos de cuerpo completo.</span>
                    </span>
                </button>
                <button
                    type="button"
                    role="radio"
                    aria-checked={currentLayout === 'collage'}
                    className={`layout-option ${currentLayout === 'collage' ? 'active' : ''}`}
                    onClick={() => handleLayoutChange('collage')}
                    disabled={savingLayout}
                >
                    <span className="layout-option-icon"><Columns3 size={22} /></span>
                    <span className="layout-option-text">
                        <span className="layout-option-title">Collage {currentLayout === 'collage' && <Check size={14} />}</span>
                        <span className="layout-option-desc">
                            Se agrupan {viewMode === 'mobile' ? '2' : '3'} imágenes lado a lado por slide, a pantalla completa.
                        </span>
                    </span>
                </button>
            </div>

            <p className="admin-card-desc">
                {currentLayout === 'single'
                    ? `Single (${deviceLabel}): cada imagen que agregues es un slide completo.`
                    : `Collage (${deviceLabel}): cada slide muestra ${imgsPerSlide} imágenes, agrupadas de a ${imgsPerSlide} según el orden establecido.`}
                {' '}Los banners editables siempre ocupan un slide completo.
            </p>

            {error && (
                <p className="carousel-manager-error" role="alert">{error}</p>
            )}

            <button type="button" className="add-banner-btn" onClick={() => setEditor({ mode: 'new' })}>
                <span className="add-banner-btn__icon"><LayoutTemplate size={22} /></span>
                <span className="add-banner-btn__text">
                    <span className="add-banner-btn__title">Crear banner editable ({deviceLabel})</span>
                    <span className="add-banner-btn__desc">Armá un slide con título, subtítulo, botón y fotos opcionales; movelos y cambiá los colores a gusto.</span>
                </span>
            </button>

            <form onSubmit={handleAdd} className="add-carousel-form">
                <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="O pegá la URL de una imagen..."
                    aria-label="URL de la nueva imagen"
                    required
                    disabled={saving}
                />
                <button type="submit" className="admin-btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Añadir Imagen'}
                </button>
            </form>

            {loading ? (
                <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <LiaLoader size="md" />
                    <span>Cargando imágenes...</span>
                </div>
            ) : (
                <>
                    {filteredImages.length > 0 && (
                        <div className="slides-summary">
                            <span className="slides-count">
                                {activeSlides} slides activos ({activeImages.length} elementos activos)
                            </span>
                        </div>
                    )}

                    <Reorder.Group
                        axis="y"
                        values={filteredImages}
                        onReorder={handleReorder}
                        className="carousel-list"
                    >
                        {filteredImages.map((img) => (
                            <CarouselListItem
                                key={img.id}
                                image={img}
                                position={slidePositions.get(img.id) ?? { slideNumber: 1, positionInSlide: 1, slideSize: imgsPerSlide, isFirstInSlide: true }}
                                onToggle={handleToggle}
                                onDelete={handleDelete}
                                onCopy={handleCopy}
                                onEditBanner={(image) => setEditor({ mode: 'edit', image })}
                                onEditNavbar={setNavbarTarget}
                            />
                        ))}
                    </Reorder.Group>

                    {filteredImages.length === 0 && (
                        <div className="empty-state">
                            No hay imágenes {viewMode === 'mobile' ? 'para mobile' : 'para desktop'} en el carrusel.
                            Creá un banner editable o pegá la URL de una foto para empezar.
                        </div>
                    )}
                </>
            )}

            {editor && (
                <Suspense fallback={<div className="banner-editor-loading"><LiaLoader size="lg" /></div>}>
                    <BannerEditor
                        key={editor.mode === 'edit' ? editor.image.id : 'new'}
                        device={viewMode}
                        isNew={editor.mode === 'new'}
                        initialDesign={editor.mode === 'edit' && editor.image.design ? editor.image.design : createStarterDesign(viewMode)}
                        initialNavbarColor={editor.mode === 'edit' ? editor.image.navbarColor : null}
                        onSave={handleSaveBanner}
                        onClose={() => setEditor(null)}
                    />
                </Suspense>
            )}

            <Suspense fallback={null}>
                {navbarTarget && (
                    <NavbarColorDialog
                        key={navbarTarget.id}
                        image={navbarTarget}
                        isCollageSlide={navbarTarget.kind === 'image' && currentLayout === 'collage'}
                        onSave={handleSaveNavbarColor}
                        onClose={() => setNavbarTarget(null)}
                    />
                )}
                {bannerToDelete && (
                    <ConfirmationModal
                        isOpen
                        status="error"
                        title="¿Eliminar este banner?"
                        message="Se pierde todo el diseño y no se puede recuperar."
                        actionButtonText="Eliminar"
                        cancelButtonText="Cancelar"
                        onActionClick={() => void deleteImage(bannerToDelete.id)}
                        onClose={() => setBannerToDelete(null)}
                    />
                )}
            </Suspense>
        </div>
    );
};

export default CarouselManager;
