import { useEffect, useRef, useState } from 'react';
import { X, Save } from 'lucide-react';
import type { CarouselImage } from '../../store/adminStore';
import BannerCanvas from '../../../components/common/BannerCanvas/BannerCanvas';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import { BANNER_REFERENCE_WIDTH, type BannerDesign } from '../../../utils/carouselBanner';
import { buildCloudinaryUrl } from '../../../utils/cloudinary';
import { pickReadableTextColor } from '../../../utils/navbarColor';
import { DEFAULT_NAVBAR_STYLE, getSiteContent, normalizeNavbarStyleInfo } from '../../../services/siteContentService';
import NavbarColorControl from './NavbarColorControl';
import NavbarPreviewBar from './NavbarPreviewBar';
import { useBackdropColor } from './useBackdropColor';
import { useBannerBackdrop } from './useBannerBackdrop';
import './NavbarColor.css';

interface NavbarColorDialogProps {
  image: CarouselImage;
  isCollageSlide: boolean;
  onSave: (color: string | null) => Promise<void>;
  onClose: () => void;
}

const EMPTY_DESIGN: BannerDesign = { background: '#ffffff', gradientTo: null, backgroundImage: null, overlay: 0, elements: [] };
const PREVIEW_IMAGE_WIDTH = 960;
const SAVE_ERROR = 'No pudimos guardar el color. Reintentá.';

const PreviewMedia = ({ image, design }: { image: CarouselImage; design: BannerDesign | null }) =>
  design
    ? <BannerCanvas design={design} referenceWidth={BANNER_REFERENCE_WIDTH[image.deviceType]} />
    : <img className="nc-preview__img" src={buildCloudinaryUrl(image.url, { width: PREVIEW_IMAGE_WIDTH, crop: 'limit' })} alt="" />;

// Para un banner el contraste se mide contra su fondo; para una foto, contra la
// franja superior de la imagen (donde queda el menú).
const useImageBackdrop = (image: CarouselImage, design: BannerDesign | null) => {
  const bannerBackdrop = useBannerBackdrop(design ?? EMPTY_DESIGN);
  const photoBackdrop = useBackdropColor(design ? null : image.url, null);
  return design ? bannerBackdrop : photoBackdrop;
};

const NavbarColorDialog = ({ image, isCollageSlide, onSave, onClose }: NavbarColorDialogProps) => {
  const design = image.kind === 'banner' ? image.design : null;
  const [color, setColor] = useState<string | null>(image.navbarColor);
  const [siteColor, setSiteColor] = useState(DEFAULT_NAVBAR_STYLE.overlayTextColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdrop = useImageBackdrop(image, design);
  const isDirty = color !== image.navbarColor;

  useEffect(() => {
    dialogRef.current?.focus();
    void getSiteContent<unknown>('navbarStyle')
      .then((value) => setSiteColor(normalizeNavbarStyleInfo(value)?.overlayTextColor ?? DEFAULT_NAVBAR_STYLE.overlayTextColor))
      .catch(() => undefined);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(color);
    } catch (saveError) {
      setError(saveError instanceof Error && saveError.message ? saveError.message : SAVE_ERROR);
      setSaving(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      className="nc-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nc-dialog-title"
      tabIndex={-1}
      onKeyDown={(event) => { if (event.key === 'Escape' && !saving) onClose(); }}
    >
      <div className="nc-dialog__panel">
        <header className="nc-dialog__header">
          <h2 id="nc-dialog-title">Color del menú de este slide</h2>
          <button type="button" className="nc-icon-btn" onClick={onClose} aria-label="Cerrar" disabled={saving}>
            <X size={18} />
          </button>
        </header>

        <div className="nc-dialog__body">
          <div className={`nc-preview nc-preview--${image.deviceType}`}>
            <PreviewMedia image={image} design={design} />
            <NavbarPreviewBar color={color ?? siteColor} />
          </div>

          <div className="nc-dialog__controls">
            {isCollageSlide && (
              <p className="nc-note">En un collage el menú cruza varias fotos: vale el color de la primera de cada slide.</p>
            )}
            <NavbarColorControl
              value={color}
              onChange={setColor}
              backdrop={backdrop}
              onAutoPick={() => backdrop.rgb && setColor(pickReadableTextColor(backdrop.rgb))}
            />
            {error && <p className="nc-error" role="alert">{error}</p>}
          </div>
        </div>

        <footer className="nc-dialog__footer">
          <button type="button" className="nc-btn" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="nc-btn nc-btn--primary" onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? <LiaLoader size="sm" /> : <Save size={16} />} {saving ? 'Guardando…' : 'Guardar color'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default NavbarColorDialog;
