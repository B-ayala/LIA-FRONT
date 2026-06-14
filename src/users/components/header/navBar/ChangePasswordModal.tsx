import { useState } from 'react';
import { TextField, Button, CircularProgress, Alert } from '@mui/material';
import Modal from '../../../../components/common/Modal/Modal';
import { changePassword } from '../../../../services/userService';
import { validatePassword, validatePasswordMatch } from '../../../../utils/validation';
import { extractErrorMessage } from '../../../../utils/errorMessage';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal = ({ isOpen, onClose }: ChangePasswordModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleClose = () => {
    onClose();
    // Reset form after modal closes
    setTimeout(() => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedbackMessage(null);
    }, 200);
  };

  const handlePasswordChange = async () => {
    if (!currentPassword.trim()) {
      setFeedbackMessage({ type: 'error', text: 'La contraseña actual es requerida' });
      return;
    }

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      setFeedbackMessage({ type: 'error', text: pwdError });
      return;
    }

    const matchError = validatePasswordMatch(newPassword, confirmPassword);
    if (matchError) {
      setFeedbackMessage({ type: 'error', text: matchError });
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setFeedbackMessage({
        type: 'success',
        text: 'Contraseña actualizada exitosamente',
      });
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      setFeedbackMessage({
        type: 'error',
        text: extractErrorMessage(error, 'Error al cambiar la contraseña'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cambiar contraseña"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.75rem' }}>
        {feedbackMessage && (
          <Alert
            severity={feedbackMessage.type}
            onClose={() => setFeedbackMessage(null)}
            sx={{
              borderRadius: '12px',
            }}
          >
            {feedbackMessage.text}
          </Alert>
        )}

        {/* Contraseña actual */}
        <TextField
          label="Contraseña actual"
          type="password"
          fullWidth
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={isLoading}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': { fontSize: '0.95rem' },
            '& .MuiInputLabel-root': { fontSize: '0.95rem' },
          }}
        />

        {/* Nueva contraseña */}
        <TextField
          label="Nueva contraseña"
          type="password"
          fullWidth
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': { fontSize: '0.95rem' },
            '& .MuiInputLabel-root': { fontSize: '0.95rem' },
          }}
        />

        {/* Confirmar contraseña */}
        <TextField
          label="Confirmar nueva contraseña"
          type="password"
          fullWidth
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': { fontSize: '0.95rem' },
            '& .MuiInputLabel-root': { fontSize: '0.95rem' },
          }}
        />

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            marginTop: '0.5rem',
          }}
        >
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handlePasswordChange}
            disabled={isLoading}
            sx={{
              background: 'var(--primary-accent)',
              '&:hover': {
                background: 'var(--primary-dark)',
              },
              '&:disabled': {
                background: 'rgba(184,165,200,0.5)',
              },
            }}
          >
            {isLoading ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ChangePasswordModal;
