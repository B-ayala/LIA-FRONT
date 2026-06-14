import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button, TextField } from '@mui/material';
import { useAdminStore } from '../../store/adminStore';
import { buildCloudinaryUrl } from '../../../utils/cloudinary';
import { deleteSiteContent, getSiteContent, saveSiteContent } from '../../../services/siteContentService';
import HeroImageEditor from './HeroImageEditor';
import './AboutEditor.css';

interface HeroImageData {
  imageUrl: string;
  altText: string;
  title: string;
  backgroundPosition?: string;
}

const AboutEditor = () => {
    const { aboutInfo, updateAboutInfo } = useAdminStore();
    const [title, setTitle] = useState(aboutInfo.title);
    const [description, setDescription] = useState(aboutInfo.description);
    const [imageUrl, setImageUrl] = useState(aboutInfo.imageUrl);
    const [mission, setMission] = useState(aboutInfo.mission);
    const [vision, setVision] = useState(aboutInfo.vision);
    const [values, setValues] = useState(aboutInfo.values);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Hero Image state
    const [heroImageUrl, setHeroImageUrl] = useState('');
    const [heroAltText, setHeroAltText] = useState('');
    const [heroTitle, setHeroTitle] = useState('Lia – Tu estilo, tu esencia');
    const [heroBackgroundPosition, setHeroBackgroundPosition] = useState('50% 50%');

    useEffect(() => {
        const loadAboutInfo = async () => {
            try {
                const info = await getSiteContent<any>('about');

                if (info) {
                    setTitle(info.title ?? '');
                    setDescription(info.description ?? '');
                    setImageUrl(info.imageUrl ?? '');
                    setMission(info.mission ?? '');
                    setVision(info.vision ?? '');
                    setValues(info.values ?? []);
                    updateAboutInfo(info);
                }

                const hero = await getSiteContent<HeroImageData>('hero_image');

                if (hero) {
                    setHeroImageUrl(hero.imageUrl ?? '');
                    setHeroAltText(hero.altText ?? '');
                    setHeroTitle(hero.title ?? 'Lia – Tu estilo, tu esencia');
                    setHeroBackgroundPosition(hero.backgroundPosition ?? '50% 50%');
                }
            } catch (err) {
                console.error('Error loading data:', err);
                setError(err instanceof Error ? err.message : 'Error al cargar los datos.');
            } finally {
                setLoading(false);
            }
        };

        loadAboutInfo();
    }, []);

    const handleSave = async (e: { preventDefault: () => void }) => {
        e.preventDefault();
        setError(null);

        if (heroImageUrl && !heroAltText) {
            setError('Por favor, completa el texto alternativo de la imagen hero.');
            return;
        }

        const newInfo = { title, description, imageUrl, mission, vision, values };
        const heroData: HeroImageData = {
            imageUrl: heroImageUrl,
            altText: heroAltText || heroTitle,
            title: heroTitle,
            backgroundPosition: heroBackgroundPosition
        };

        try {
            await saveSiteContent('about', newInfo);

            if (heroImageUrl) {
                await saveSiteContent('hero_image', heroData);
            } else {
                await deleteSiteContent('hero_image');
            }

            updateAboutInfo(newInfo);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Error saving:', err);
            setError(err instanceof Error ? err.message : 'Error al guardar. Intentá de nuevo.');
        }
    };

    const handleValueChange = (index: number, field: 'title' | 'description', value: string) => {
        const newValues = [...values];
        newValues[index] = { ...newValues[index], [field]: value };
        setValues(newValues);
    };

    const addValue = () => {
        setValues([...values, { title: '', description: '' }]);
    };

    const removeValue = (index: number) => {
        setValues(values.filter((_, i) => i !== index));
    };

    if (loading) return <div className="admin-about-editor"><p>Cargando...</p></div>;

    return (
        <div className="admin-about-editor">
            <div className="admin-page-header">
                <h1 className="admin-page-title">Acerca de - Nosotros e Imagen Hero</h1>
                <p className="admin-page-subtitle">Modifica la información de la sección Sobre Nosotros y la imagen de fondo del home.</p>
            </div>

            <div className="admin-card">
                <form onSubmit={handleSave} className="about-form">
                    {/* Hero Image Section */}
                    <div style={{ borderBottom: '2px solid #eee', paddingBottom: '2rem', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>Imagen Hero - Home</h2>

                        <div className="about-hero-fields">
                            <div className="form-group">
                                <TextField
                                    label="Título del Hero"
                                    value={heroTitle}
                                    onChange={(e) => setHeroTitle(e.target.value)}
                                    placeholder="Ej: Lia – Tu estilo, tu esencia"
                                    helperText="Este texto aparecerá como atributo alt si no especificas uno."
                                    required
                                    fullWidth
                                    size="small"
                                />
                            </div>

                            <div className="form-group">
                                <TextField
                                    label="URL de la imagen de fondo"
                                    type="url"
                                    value={heroImageUrl}
                                    onChange={(e) => setHeroImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    helperText="Pega la URL de Cloudinary o cualquier servicio de hosting de imágenes."
                                    fullWidth
                                    size="small"
                                />
                            </div>

                            <div className="form-group">
                                <TextField
                                    label="Texto alternativo de la imagen"
                                    value={heroAltText}
                                    onChange={(e) => setHeroAltText(e.target.value)}
                                    placeholder="Descripción para accesibilidad"
                                    helperText="Importante para SEO y accesibilidad."
                                    fullWidth
                                    size="small"
                                />
                            </div>
                        </div>

                        {heroImageUrl && (
                            <HeroImageEditor
                                imageUrl={buildCloudinaryUrl(heroImageUrl, {
                                    width: 800,
                                    quality: 'auto',
                                    format: 'auto'
                                })}
                                backgroundPosition={heroBackgroundPosition}
                                onPositionChange={setHeroBackgroundPosition}
                            />
                        )}
                    </div>

                    {/* About Section */}
                    <div className="form-group">
                        <TextField
                            label="Título de la sección"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            fullWidth
                            size="small"
                        />
                    </div>

                    <div className="form-group">
                        <TextField
                            label="Descripción completa"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            fullWidth
                            size="small"
                            multiline
                            rows={8}
                        />
                    </div>

                    <div className="form-group">
                        <TextField
                            label="URL de la imagen principal"
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            fullWidth
                            size="small"
                        />
                    </div>

                    {imageUrl && (
                        <div className="form-group">
                            <label>Vista previa de imagen</label>
                            <div className="about-preview-container">
                                <img src={imageUrl} alt="preview" className="about-preview-img" />
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <TextField
                            label="Nuestra Misión"
                            value={mission}
                            onChange={(e) => setMission(e.target.value)}
                            required
                            fullWidth
                            size="small"
                            multiline
                            rows={4}
                        />
                    </div>

                    <div className="form-group">
                        <TextField
                            label="Nuestra Visión"
                            value={vision}
                            onChange={(e) => setVision(e.target.value)}
                            required
                            fullWidth
                            size="small"
                            multiline
                            rows={4}
                        />
                    </div>

                    <div className="form-group">
                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Nuestros Valores</p>
                        {values.map((value, index) => (
                            <div key={index} style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                <TextField
                                    label="Nombre del valor"
                                    placeholder="Ej: Autenticidad"
                                    value={value.title}
                                    onChange={(e) => handleValueChange(index, 'title', e.target.value)}
                                    fullWidth
                                    size="small"
                                    sx={{ mb: 1 }}
                                />
                                <TextField
                                    label="Descripción"
                                    value={value.description}
                                    onChange={(e) => handleValueChange(index, 'description', e.target.value)}
                                    fullWidth
                                    size="small"
                                    multiline
                                    rows={2}
                                    sx={{ mb: 1 }}
                                />
                                <Button
                                    type="button"
                                    onClick={() => removeValue(index)}
                                    variant="contained"
                                    color="error"
                                    size="small"
                                >
                                    Eliminar
                                </Button>
                            </div>
                        ))}
                        <Button
                            type="button"
                            onClick={addValue}
                            variant="contained"
                            color="success"
                            sx={{ alignSelf: 'flex-start' }}
                        >
                            + Agregar Valor
                        </Button>
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

export default AboutEditor;
