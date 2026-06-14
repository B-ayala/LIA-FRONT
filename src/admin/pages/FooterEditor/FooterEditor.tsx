import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Checkbox, FormControlLabel, TextField } from '@mui/material';
import { useAdminStore } from '../../store/adminStore';
import { getSiteContent, normalizeBannerInfo, saveSiteContent } from '../../../services/siteContentService';
import type { BannerInfo } from '../../../services/siteContentService';
import './FooterEditor.css';

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
            } catch (err) {
                console.error('Error loading site config:', err);
                setError(err instanceof Error ? err.message : 'Error al cargar los datos.');
            } finally {
                setLoading(false);
            }
        };

        loadFooterInfo();
    }, []);

    const handleSave = async (e: { preventDefault: () => void }) => {
        e.preventDefault();
        setError(null);
        const newInfo = {
            brandName, description, whatsapp, email,
            tiktokUser, tiktokUrl, facebookUser, facebookUrl,
            address, mapQuery, copyright
        };

        try {
            console.log('[FooterEditor] Guardando footer:', newInfo);
            await saveSiteContent('footer', newInfo);
            console.log('[FooterEditor] Footer guardado ✅');

            // Guardar banner
            const bannerInfo: BannerInfo = {
                text: bannerText,
                visible: bannerVisible
            };

            console.log('[FooterEditor] Guardando banner:', bannerInfo);
            await saveSiteContent('banner', bannerInfo);
            console.log('[FooterEditor] Banner guardado ✅');

            updateFooterInfo(newInfo);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('[FooterEditor] Error general:', err);
            setError(err instanceof Error ? err.message : 'Error al guardar. Intentá de nuevo.');
        }
    };

    if (loading) return <div className="admin-footer-editor"><p>Cargando...</p></div>;

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
