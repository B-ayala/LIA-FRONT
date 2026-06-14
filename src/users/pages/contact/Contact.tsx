import { useState, useEffect } from 'react';
import { FiMail, FiMapPin } from 'react-icons/fi';
import { FaWhatsapp, FaTiktok, FaFacebook } from 'react-icons/fa';
import { supabase } from '../../../config/supabaseClient';
import Modal from '../../../components/common/Modal/Modal';
import SEO from '../../../components/common/SEO/SEO';
import type { FooterInfo } from '../../../admin/store/adminStore';
import { getSiteContent } from '../../../services/siteContentService';
import './Contact.css';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const Contact = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [footerInfo, setFooterInfo] = useState<FooterInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Formulario
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string>('');

  // Cargar datos del footer desde Supabase
  useEffect(() => {
    const loadFooter = async () => {
      try {
        const data = await getSiteContent<FooterInfo>('footer');

        if (data) {
          setFooterInfo(data);
        }
      } catch (err) {
        console.error('Error loading footer info:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadFooter();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.currentTarget;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setSubmitError('Por favor completa todos los campos');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitError('');

    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        throw error;
      }

      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('Error sending message:', err);
      setSubmitError('Error al enviar el mensaje. Por favor intenta nuevamente.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="contact-page">
        <div className="contact-header">
          <h1>Siempre cerca de ti</h1>
          <p>Cargando información de contacto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-page">
      <SEO
        title="Contacto"
        description="Contactanos por WhatsApp, redes sociales o email. Estamos para ayudarte con tus compras, consultas y envíos a todo el país."
        path="/contact"
      />
      <div className="contact-header">
        <h1>Siempre cerca de ti</h1>
        <p>¿Tienes alguna duda, sugerencia o simplemente quieres saludarnos? ¡Nos encantaría escucharte!</p>
      </div>

      <div className="contact-container">
        <div className="contact-options">

          <div className="contact-card">
            <div className="contact-icon-wrapper">
              <FaWhatsapp className="contact-icon" />
            </div>
            <h3>WhatsApp</h3>
            <p>Escríbenos para ayudarte con tus compras o consultas.</p>
            {footerInfo?.whatsapp && (
              <a
                href={`https://wa.me/${footerInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-btn"
                style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}
              >
                Iniciar Chat
              </a>
            )}
          </div>

          <div className="contact-card">
            <div className="contact-icon-wrapper">
              <FaTiktok className="contact-icon" style={{ marginRight: '10px' }} />
              <FaFacebook className="contact-icon" />
            </div>
            <h3>Redes Sociales</h3>
            <p>Únete a nuestra comunidad, síguenos y comparte tus looks.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {footerInfo?.tiktokUrl && (
                <a href={footerInfo.tiktokUrl} target="_blank" rel="noopener noreferrer" className="contact-link">
                  TikTok
                </a>
              )}
              {footerInfo?.facebookUrl && (
                <a href={footerInfo.facebookUrl} target="_blank" rel="noopener noreferrer" className="contact-link">
                  Facebook
                </a>
              )}
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-icon-wrapper">
              <FiMail className="contact-icon" />
            </div>
            <h3>Correo Electrónico</h3>
            <p>Escríbenos directamente y te responderemos a la brevedad.</p>
            {footerInfo?.email && (
              <>
                <a href={`mailto:${footerInfo.email}`} className="contact-link" style={{ marginBottom: '10px', display: 'block' }}>
                  {footerInfo.email}
                </a>
                <button
                  className="contact-btn"
                  onClick={() => {
                    setSubmitStatus('idle');
                    setSubmitError('');
                    setIsModalOpen(true);
                  }}
                >
                  Envíanos un mensaje
                </button>
              </>
            )}
          </div>

        </div>

        <div className="contact-footer-note" style={{ display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'center' }}>
          <div>
            <FiMapPin className="inline-icon" style={{ marginRight: '5px' }} />
            <span>Avelino Díaz & Alfonsina Storni, Villa Celina, Buenos Aires</span>
          </div>
          <p>Hacemos envíos a todo el país. Llevamos LIA hasta la puerta de tu casa.</p>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setSubmitStatus('idle');
            setSubmitError('');
          }
        }}
        title="Envíanos un mensaje"
      >
        <div className="contact-form-container">
          {submitStatus === 'success' ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#2c5f2d' }}>
              <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
                ¡Mensaje enviado con éxito!
              </p>
              <p>Te contactaremos pronto. Gracias por elegirnos.</p>
            </div>
          ) : (
            <>
              <p className="form-intro">Completa el siguiente formulario y nos pondremos en contacto contigo lo antes posible. ¡Gracias por elegirnos!</p>

              {submitStatus === 'error' && (
                <div style={{
                  backgroundColor: '#fee',
                  color: '#c33',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  fontSize: '14px'
                }}>
                  {submitError}
                </div>
              )}

              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Nombre</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Tu nombre"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Correo electrónico</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Asunto</label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="consulta">Consulta sobre producto</option>
                    <option value="envio">Estado de envío</option>
                    <option value="devolucion">Cambio o Devolución</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Mensaje</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder="¿En qué podemos ayudarte?"
                    value={formData.message}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                  style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
                </button>
              </form>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Contact;
