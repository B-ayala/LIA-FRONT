import { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { Checkbox, FormControlLabel, TextField } from '@mui/material';
import { useAdminStore } from '../../store/adminStore';
import {
  getSiteContent,
  normalizeBannerInfo,
  normalizeWelcomeModalInfo,
  saveSiteContent,
  DEFAULT_WELCOME_MODAL,
} from '../../../services/siteContentService';
import type { BannerInfo } from '../../../services/siteContentService';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import './FooterEditor.css';

// URL opcional pero, si se carga, debe ser http(s) absoluta — evita guardar
// enlaces rotos o esquemas peligrosos (javascript:, data:) en el footer público.
const isValidHttpUrl = (value: string): boolean => {
    if (!value.trim()) return true;

    try {
        const { protocol } = new URL(value.trim());
        return protocol === 'http:' || protocol === 'https:';
    } catch {
        return false;
    }
};

const FooterEditor = () => {
    const { footerInfo, updateFooterInfo } = useAdminStore();

    const [brandName, setBrandName] = useState(footerInfo.brandName);
    const [description, setDescription] = useState(footerInfo.description);
    const [whatsapp, setWhatsapp] = useState(footerInfo.whatsapp);
    const [email, setEmail] = useState(footerInfo.email);
    const [tiktokUser, setTiktokUser] = useState(footerInfo.tiktokUser);
    const [tiktokUrl, setTiktokUrl] = useState(footerInfo.tiktokUrl);
    const [facebookUser, setFacebookUser] = useState(footerInfo.facebookUser);
    const [facebookUrl, setFacebookUrl] = useState(footerInfo.facebookUrl);
    const [address, setAddress] = useState(footerInfo.address);
    const [mapQuery, setMapQuery] = useState(footerInfo.mapQuery);
    const [copyright, setCopyright] = useState(footerInfo.copyright);
    const [bannerText, setBannerText] = useState('');
    const [bannerVisible, setBannerVisible] = useState(false);
    const [welcomeEnabled, setWelcomeEnabled] = useState(DEFAULT_WELCOME_MODAL.enabled);
    const [welcomeHeading, setWelcomeHeading] = useState(DEFAULT_WELCOME_MODAL.heading);
    const [welcomeLines, setWelcomeLines] = useState<string[]>(DEFAULT_WELCOME_MODAL.lines);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadFooterInfo = async () => {
            try {
                const info = await getSiteContent<typeof footerInfo>('footer');

                if (info) {
                    setBrandName(info.brandName ?? '');
                    setDescription(info.description ?? '');
                    setWhatsapp(info.whatsapp ?? '');
                    setEmail(info.email ?? '');
                    setTiktokUser(info.tiktokUser ?? '');
                    setTiktokUrl(info.tiktokUrl ?? '');
                    setFacebookUser(info.facebookUser ?? '');
                    setFacebookUrl(info.facebookUrl ?? '');
                    setAddress(info.address ?? '');
                    setMapQuery(info.mapQuery ?? '');
                    setCopyright(info.copyright ?? '');
                    updateFooterInfo(info);
                }

                const bannerValue = await getSiteContent<unknown>('banner');
                const banner = normalizeBannerInfo(bannerValue);
                if (banner) {
                    setBannerText(banner.text ?? '');
                    setBannerVisible(banner.visible ?? false);
                }

                const welcomeValue = await getSiteContent<unknown>('welcomeModal');
                const welcome = normalizeWelcomeModalInfo(welcomeValue);
                if (welcome) {
                    setWelcomeEnabled(welcome.enabled);
                    setWelcomeHeading(welcome.heading);
                    setWelcomeLines(welcome.lines.length > 0 ? welcome.lines : ['']);
                }
            } catch (err) {
                console.error('Error loading site config:', err);
                setError(err instanceof Error ? err.message : 'Error al cargar los datos.');
            } finally {
                setLoading(false);
            }
        };

        loadFooterInfo();
    }, []);

    const handleWelcomeLineChange = (index: number, value: string) => {
        setWelcomeLines((prev) => prev.map((line, i) => (i === index ? value : line)));
    };

    const handleAddWelcomeLine = () => {
        setWelcomeLines((prev) => (prev.length >= 8 ? prev : [...prev, '']));
    };

    const handleRemoveWelcomeLine = (index: number) => {
        setWelcomeLines((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = async (e: { preventDefault: () => void }) => {
        e.preventDefault();
        setError(null);

        const invalidUrls = [
            ['TikTok URL', tiktokUrl],
            ['Facebook URL', facebookUrl],
        ]
            .filter(([, value]) => !isValidHttpUrl(value))
            .map(([label]) => label);

        if (invalidUrls.length > 0) {
            setError(`Revisá las URLs (${invalidUrls.join(', ')}): deben empezar con http:// o https://.`);
            return;
        }

        const newInfo = {
            brandName, description, whatsapp, email,
            tiktokUser, tiktokUrl, facebookUser, facebookUrl,
            address, mapQuery, copyright
        };

        try {
            await saveSiteContent('footer', newInfo);

            const bannerInfo: BannerInfo = {
                text: bannerText,
                visible: bannerVisible
            };

            await saveSiteContent('banner', bannerInfo);

            await saveSiteContent('welcomeModal', {
                enabled: welcomeEnabled,
                heading: welcomeHeading.trim(),
                lines: welcomeLines.map((line) => line.trim()).filter((line) => line.length > 0),
            });

            updateFooterInfo(newInfo);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('[FooterEditor] Error general:', err);
            setError(err instanceof Error ? err.message : 'Error al guardar. Intentá de nuevo.');
        }
    };

    if (loading) return <div className="admin-footer-editor"><LiaLoader size="lg" variant="section" label="Cargando..." /></div>;

    return (
        <div className="admin-footer-editor">
            <div className="admin-page-header">
                <h1 className="admin-page-title">Configuración del sitio</h1>
                <p className="admin-page-subtitle">Editá el contenido del footer que aparece en la tienda.</p>
            </div>

            <div className="admin-card">
                <form onSubmit={handleSave} className="footer-editor-form">
                    {/* Marca */}
                    <h3 className="footer-editor-section-title">Marca</h3>
                    <div className="footer-editor-grid">
                        <div className="form-group">
                            <TextField label="Nombre de la marca" type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} required fullWidth size="small" />
                        </div>
                        <div className="form-group">
                            <TextField label="Copyright" type="text" value={copyright} onChange={(e) => setCopyright(e.target.value)} required fullWidth size="small" />
                        </div>
                    </div>

                    <div className="form-group">
                        <TextField label="Descripción del footer" value={description} onChange={(e) => setDescription(e.target.value)} required fullWidth size="small" multiline rows={4} />
                    </div>

                    {/* Contacto */}
                    <h3 className="footer-editor-section-title">Contacto</h3>
                    <div className="footer-editor-grid">
                        <div className="form-group">
                            <TextField label="WhatsApp" type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} fullWidth size="small" />
                        </div>
                        <div className="form-group">
                            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth size="small" />
                        </div>
                    </div>

                    {/* Redes sociales */}
                    <h3 className="footer-editor-section-title">Redes sociales</h3>
                    <div className="footer-editor-grid">
                        <div className="form-group">
                            <TextField label="TikTok usuario" type="text" value={tiktokUser} onChange={(e) => setTiktokUser(e.target.value)} fullWidth size="small" />
                        </div>
                        <div className="form-group">
                            <TextField label="TikTok URL" type="url" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} fullWidth size="small" />
                        </div>
                        <div className="form-group">
                            <TextField label="Facebook usuario" type="text" value={facebookUser} onChange={(e) => setFacebookUser(e.target.value)} fullWidth size="small" />
                        </div>
                        <div className="form-group">
                            <TextField label="Facebook URL" type="url" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} fullWidth size="small" />
                        </div>
                    </div>

                    {/* Ubicación */}
                    <h3 className="footer-editor-section-title">Ubicación</h3>
                    <div className="form-group">
                        <TextField label="Dirección" type="text" value={address} onChange={(e) => setAddress(e.target.value)} fullWidth size="small" />
                    </div>
                    <div className="form-group">
                        <TextField label="Query del mapa (URL-encoded para Google Maps)" type="text" value={mapQuery} onChange={(e) => setMapQuery(e.target.value)} fullWidth size="small" />
                    </div>

                    {mapQuery && (
                        <div className="form-group">
                            <label>Vista previa del mapa</label>
                            <div className="footer-editor-map-preview">
                                <iframe
                                    title="Mapa preview"
                                    src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                    width="100%"
                                    height="220"
                                    style={{ border: 0 }}
                                    allowFullScreen={false}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                ></iframe>
                            </div>
                        </div>
                    )}

                    {/* Banner */}
                    <h3 className="footer-editor-section-title">Banner de la tienda</h3>
                    <div className="form-group">
                        <TextField
                            label="Texto del banner"
                            value={bannerText}
                            onChange={(e) => setBannerText(e.target.value)}
                            placeholder="ej: MEGA SALE – TAKE 10% OFF"
                            fullWidth
                            size="small"
                        />
                    </div>
                    <div className="form-group">
                        <FormControlLabel
                            control={<Checkbox checked={bannerVisible} onChange={(e) => setBannerVisible(e.target.checked)} />}
                            label="Mostrar banner"
                        />
                    </div>

                    {/* Modal de bienvenida */}
                    <h3 className="footer-editor-section-title">Modal de bienvenida</h3>
                    <p className="footer-editor-section-hint">
                        Se muestra una vez por visita, justo al entrar al sitio.
                    </p>
                    <div className="form-group">
                        <TextField
                            label="Título"
                            value={welcomeHeading}
                            onChange={(e) => setWelcomeHeading(e.target.value)}
                            placeholder="ej: ✨️ Calzados e Indumentaria ✨️"
                            fullWidth
                            size="small"
                        />
                    </div>
                    <div className="welcome-lines-list">
                        {welcomeLines.map((line, index) => (
                            <div className="welcome-line-row" key={index}>
                                <TextField
                                    label={`Línea ${index + 1}`}
                                    value={line}
                                    onChange={(e) => handleWelcomeLineChange(index, e.target.value)}
                                    placeholder="ej: Enviamos a todo el país 🇦🇷"
                                    fullWidth
                                    size="small"
                                />
                                <button
                                    type="button"
                                    className="welcome-line-remove"
                                    onClick={() => handleRemoveWelcomeLine(index)}
                                    aria-label="Eliminar línea"
                                    disabled={welcomeLines.length <= 1}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="admin-btn-secondary admin-flex-center gap-2"
                        onClick={handleAddWelcomeLine}
                        disabled={welcomeLines.length >= 8}
                    >
                        <Plus size={16} /> Agregar línea
                    </button>
                    <div className="form-group">
                        <FormControlLabel
                            control={<Checkbox checked={welcomeEnabled} onChange={(e) => setWelcomeEnabled(e.target.checked)} />}
                            label="Mostrar modal de bienvenida"
                        />
                    </div>

                    <div className="form-actions border-t pt-4 mt-6">
                        <button type="submit" className="admin-btn-primary save-btn admin-flex-center gap-2">
                            <Save size={18} /> Guardar Cambios
                        </button>
                        {saved && <span className="save-success text-green-600 font-medium">¡Guardado con éxito!</span>}
                        {error && <span className="text-red-500 font-medium">{error}</span>}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FooterEditor;
