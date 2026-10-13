import { Reorder } from 'framer-motion';
import { Trash2, Copy, GripVertical, EyeOff, Eye, Pencil } from 'lucide-react';
import type { CarouselImage } from '../../store/adminStore';
import BannerCanvas from '../../../components/common/BannerCanvas/BannerCanvas';
import { BANNER_REFERENCE_WIDTH } from '../../../utils/carouselBanner';

export interface SlidePosition {
    slideNumber: number;
    positionInSlide: number;
    slideSize: number;
    isFirstInSlide: boolean;
}

interface CarouselListItemProps {
    image: CarouselImage;
    position: SlidePosition;
    onToggle: (image: CarouselImage) => void;
    onDelete: (image: CarouselImage) => void;
    onCopy: (url: string) => void;
    onEditBanner: (image: CarouselImage) => void;
}

const CarouselListItem = ({ image, position, onToggle, onDelete, onCopy, onEditBanner }: CarouselListItemProps) => {
    const { slideNumber, positionInSlide, slideSize, isFirstInSlide } = position;
    const bannerDesign = image.kind === 'banner' ? image.design : null;
    const isBanner = bannerDesign !== null;

    return (
        <Reorder.Item
            value={image}
            className={`carousel-item ${isFirstInSlide ? 'slide-start' : ''}`}
        >
            {isFirstInSlide && (
                <div className="slide-indicator">Slide {slideNumber}</div>
            )}
            <div className="drag-handle">
                <GripVertical size={20} />
            </div>

            {bannerDesign ? (
                <button
                    type="button"
                    className={`carousel-img-preview carousel-banner-preview carousel-banner-preview--${image.deviceType}`}
                    onClick={() => onEditBanner(image)}
                    aria-label={`Editar banner del slide ${slideNumber}`}
                >
                    <BannerCanvas design={bannerDesign} referenceWidth={BANNER_REFERENCE_WIDTH[image.deviceType]} />
                </button>
            ) : (
                <div className="carousel-img-preview">
                    <img src={image.url} alt={`Slide ${slideNumber} - Img ${positionInSlide}`} />
                </div>
            )}

            <div className="carousel-item-info">
                <span className="carousel-order">
                    #{image.order} {isBanner ? '(Banner editable)' : `(Posición ${positionInSlide}/${slideSize})`}
                </span>
                <button
                    type="button"
                    className={`status-toggle ${image.isActive ? 'active' : 'inactive'}`}
                    onClick={() => onToggle(image)}
                >
                    {image.isActive ? <><Eye size={16} /> Activa</> : <><EyeOff size={16} /> Inactiva</>}
                </button>
            </div>
            <div className="carousel-item-actions">
                {isBanner ? (
                    <button
                        type="button"
                        className="admin-action-btn edit"
                        onClick={() => onEditBanner(image)}
                        title="Editar banner"
                        aria-label="Editar banner"
                    >
                        <Pencil size={18} />
                    </button>
                ) : (
                    <button
                        type="button"
                        className="admin-action-btn copy"
                        onClick={() => onCopy(image.url)}
                        title="Copiar URL"
                        aria-label="Copiar URL"
                    >
                        <Copy size={18} />
                    </button>
                )}
                <button
                    type="button"
                    className="admin-action-btn delete"
                    onClick={() => onDelete(image)}
                    title="Eliminar"
                    aria-label="Eliminar"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </Reorder.Item>
    );
};

export default CarouselListItem;
