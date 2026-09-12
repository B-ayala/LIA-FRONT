import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { EmailOtpType } from '@supabase/supabase-js';
import { confirmEmail, hasActiveSession } from '../../../services/authService';
import ConfirmationModal from '../../../components/common/Modal/ConfirmationModal';
import { useInitialLoadTask } from '../../../components/common/InitialLoad/InitialLoadProvider';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import './EmailConfirmation.css';

export const EMAIL_CONFIRMED_CHANNEL = 'db_email_confirmation';
export const EMAIL_CONFIRMED_STORAGE_KEY = 'db_email_confirmation_event';

const EMAIL_CONFIRMED_EVENT = 'EMAIL_CONFIRMED';

const EmailConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const resolved = useRef(false);

  useInitialLoadTask('route', status === 'loading');

  const broadcastAndShow = () => {
    if (resolved.current) return;
    resolved.current = true;
    const payload = JSON.stringify({ type: EMAIL_CONFIRMED_EVENT, at: Date.now() });
    try {
      const ch = new BroadcastChannel(EMAIL_CONFIRMED_CHANNEL);
      ch.postMessage({ type: EMAIL_CONFIRMED_EVENT });
      ch.close();
    } catch { /* BroadcastChannel not supported */ }
    try {
      window.localStorage.setItem(EMAIL_CONFIRMED_STORAGE_KEY, payload);
    } catch { /* localStorage not available */ }
    setStatus('success');
    setMessage('Tu cuenta fue confirmada correctamente. Ya podés iniciar sesión.');
    setIsModalOpen(true);
    setTimeout(() => window.close(), 1500);
  };

  const showError = (msg: string) => {
    if (resolved.current) return;
    resolved.current = true;
    setStatus('error');
    setMessage(msg);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const type = (searchParams.get('type') as EmailOtpType | null) ?? 'signup';
    const legacyToken = searchParams.get('token');

    const run = async () => {
      try {
        if (tokenHash) {
          await confirmEmail(tokenHash, type);
          broadcastAndShow();
          return;
        }
        // Flujo implícito: Supabase ya estableció la sesión desde el hash del link.
        if (await hasActiveSession()) {
          broadcastAndShow();
          return;
        }
        if (legacyToken) {
          await confirmEmail(legacyToken, 'signup');
          broadcastAndShow();
          return;
        }
        showError('No se encontró un token de verificación válido.');
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Error al verificar el email');
      }
    };

    void run();
  }, [searchParams]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    if (status === 'error') navigate('/');
    else window.close();
  };

  return (
    <div className="email-confirmation-page">
      {status === 'loading' && (
        <div className="confirmation-loading">
          <div style={{ background: '#fff', borderRadius: '50%', padding: '10px', display: 'flex' }}>
            <LiaLoader size="lg" />
          </div>
          <p>Verificando tu correo electrónico...</p>
        </div>
      )}

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        status={status === 'loading' ? 'error' : status}
        title={status === 'success' ? '¡Cuenta Confirmada!' : 'Error de Verificación'}
        message={message}
        actionButtonText={status === 'success' ? 'Cerrar pestaña' : 'Volver al Inicio'}
      />
    </div>
  );
};

export default EmailConfirmation;
