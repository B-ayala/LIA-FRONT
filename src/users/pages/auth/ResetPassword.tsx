import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, CircularProgress, IconButton, InputAdornment,
  Stack, TextField, Typography, Alert,
} from '@mui/material';
import { FiAlertCircle, FiCheckCircle, FiEye, FiEyeOff, FiLock } from 'react-icons/fi';
import { resetPassword, changePassword } from '../../../services/userService';
import { hasActiveSession, onPasswordRecovery } from '../../../services/authService';
import { useAuthStore } from '../../../store/authStore';
import { useInitialLoadTask } from '../../../components/common/InitialLoad/InitialLoadProvider';

const cardSx = {
  background: '#fff',
  borderRadius: '20px',
  boxShadow: '0 8px 40px rgba(184,165,200,0.25)',
  p: { xs: '2rem 1.5rem', sm: '2.5rem 2.25rem' },
  width: '100%',
  maxWidth: 440,
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    fontFamily: "'Poppins', sans-serif",
    color: 'var(--text-dark)',
    background: '#fff',
    '& fieldset': { borderColor: 'rgba(184,165,200,0.25)', borderWidth: 2 },
    '&:hover fieldset': { borderColor: 'rgba(184,165,200,0.4)' },
    '&.Mui-focused': {
      boxShadow: '0 0 0 4px rgba(184,165,200,0.15), 0 4px 12px rgba(184,165,200,0.1)',
    },
    '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)', borderWidth: 2 },
    '&.Mui-error': { background: 'rgba(231,76,60,0.05)' },
    '&.Mui-error fieldset': { borderColor: '#e74c3c' },
  },
  '& .MuiOutlinedInput-input': {
    padding: '1rem 1.25rem',
    fontSize: '1rem',
  },
  '& .MuiFormHelperText-root.Mui-error': {
    color: '#e74c3c',
    fontSize: '0.8rem',
    fontWeight: 500,
    mx: 0,
    mt: '0.25rem',
  },
};

const submitBtnSx = {
  background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
  color: 'white',
  borderRadius: '12px',
  py: '1rem',
  fontSize: '1rem',
  fontWeight: 600,
  textTransform: 'none' as const,
  fontFamily: "'Poppins', sans-serif",
  gap: '0.5rem',
  boxShadow: '0 4px 15px rgba(184,165,200,0.4)',
  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
  '&:hover': {
    background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
    boxShadow: '0 6px 25px rgba(184,165,200,0.5)',
    transform: 'translateY(-2px)',
  },
  '&.Mui-disabled': { opacity: 0.65, color: 'white' },
};

const labelSx = {
  fontSize: '0.875rem',
  color: 'var(--text-dark)',
  fontWeight: 500,
  letterSpacing: '-0.01em',
  display: 'block',
  mb: 0.5,
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  // 'waiting' | 'recovery' (via email link) | 'change' (logged-in user) | 'success' | 'invalid' | 'error'
  const [status, setStatus] = useState<'waiting' | 'recovery' | 'change' | 'success' | 'invalid' | 'error'>('waiting');
  const [errorMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const resolved = useRef(false);

  useInitialLoadTask('route', status === 'waiting');

  useEffect(() => {
    let active = true;

    const markRecovery = () => {
      if (!active || resolved.current) return;
      resolved.current = true;
      setStatus('recovery');
    };

    // El link de recuperación de Supabase dispara PASSWORD_RECOVERY (puede llegar
    // después del montaje, cuando el cliente procesa el hash del URL).
    const unsubscribe = onPasswordRecovery(markRecovery);

    const resolveInitial = async () => {
      if (resolved.current) return;

      // Caso 1: usuario logueado → cambio de contraseña (pide la actual).
      if (currentUser) {
        if (active && !resolved.current) { resolved.current = true; setStatus('change'); }
        return;
      }

      // Caso 2: sesión activa sin usuario en el store ⇒ vino del link de recuperación.
      if (await hasActiveSession()) {
        markRecovery();
        return;
      }

      // Caso 3: ni sesión de recuperación ni login → link inválido.
      if (active && !resolved.current) { resolved.current = true; setStatus('invalid'); }
    };

    void resolveInitial();

    return () => { active = false; unsubscribe(); };
  }, [currentUser]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (status === 'change' && !currentPassword) errs.currentPassword = 'Ingresá tu contraseña actual';
    if (!newPassword) errs.newPassword = 'La nueva contraseña es requerida';
    else if (newPassword.length < 6) errs.newPassword = 'Debe tener al menos 6 caracteres';
    else if (status === 'change' && newPassword === currentPassword) errs.newPassword = 'La nueva contraseña debe ser diferente a la actual';
    if (newPassword !== confirmPassword) errs.confirmPassword = 'Las contraseñas no coinciden';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setServerError('');
    setIsLoading(true);
    try {
      if (status === 'change') {
        await changePassword(currentPassword, newPassword);
      } else {
        await resetPassword(newPassword);
      }
      setStatus('success');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error al actualizar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  const fieldError = (msg?: string) =>
    msg ? (
      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <FiAlertCircle size={13} />
        {msg}
      </Box>
    ) : undefined;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(184,165,200,0.2) 0%, rgba(255,255,255,1) 60%)',
        px: 2,
      }}
    >
      <Box sx={cardSx}>
        {status === 'waiting' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
            <CircularProgress sx={{ color: 'var(--primary-color)' }} />
            <Typography sx={{ color: '#888', fontSize: '0.95rem' }}>
              Verificando el link de recuperación...
            </Typography>
          </Box>
        )}

        {status === 'invalid' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 1 }}>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(231,76,60,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FiAlertCircle size={28} color="#e74c3c" />
            </Box>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>
              Link inválido o expirado
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#888', textAlign: 'center' }}>
              El link de recuperación no es válido o ya expiró. Solicitá uno nuevo desde la pantalla de inicio de sesión.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              sx={{ ...submitBtnSx, mt: 1 }}
            >
              Volver al inicio
            </Button>
          </Box>
        )}

        {status === 'error' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 1 }}>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(231,76,60,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FiAlertCircle size={28} color="#e74c3c" />
            </Box>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>
              Error en la recuperación
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#888', textAlign: 'center' }}>
              {errorMessage}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              sx={{ ...submitBtnSx, mt: 1 }}
            >
              Volver al inicio
            </Button>
          </Box>
        )}

        {status === 'success' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 1 }}>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(46,204,113,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FiCheckCircle size={28} color="#27ae60" />
            </Box>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>
              ¡Contraseña actualizada!
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#888', textAlign: 'center' }}>
              Tu contraseña fue cambiada correctamente. Ya podés iniciar sesión con tu nueva contraseña.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              sx={{ ...submitBtnSx, mt: 1 }}
            >
              Ir al inicio
            </Button>
          </Box>
        )}

        {(status === 'recovery' || status === 'change') && (
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box
                sx={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(184,165,200,0.4)',
                  mb: 0.5,
                }}
              >
                <FiLock size={22} color="white" />
              </Box>
              <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-dark)' }}>
                {status === 'change' ? 'Cambiar contraseña' : 'Nueva contraseña'}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#888', textAlign: 'center' }}>
                Elegí una contraseña segura de al menos 6 caracteres.
              </Typography>
            </Box>

            {status === 'change' && (
              <Stack spacing={0.5}>
                <Typography component="label" htmlFor="currentPassword" sx={labelSx}>
                  Contraseña actual
                </Typography>
                <TextField
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  error={!!errors.currentPassword}
                  helperText={fieldError(errors.currentPassword)}
                  variant="outlined"
                  fullWidth
                  sx={inputSx}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowCurrent(p => !p)} edge="end" size="small" tabIndex={-1}>
                            {showCurrent ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Stack>
            )}

            <Stack spacing={0.5}>
              <Typography component="label" htmlFor="newPassword" sx={labelSx}>
                Nueva Contraseña
              </Typography>
              <TextField
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={!!errors.newPassword}
                helperText={fieldError(errors.newPassword)}
                variant="outlined"
                fullWidth
                sx={inputSx}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowNew(p => !p)} edge="end" size="small" tabIndex={-1}>
                          {showNew ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Stack>

            <Stack spacing={0.5}>
              <Typography component="label" htmlFor="confirmPassword" sx={labelSx}>
                Confirmar Contraseña
              </Typography>
              <TextField
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={!!errors.confirmPassword}
                helperText={fieldError(errors.confirmPassword)}
                variant="outlined"
                fullWidth
                sx={inputSx}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirm(p => !p)} edge="end" size="small" tabIndex={-1}>
                          {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Stack>

            {serverError && (
              <Alert
                severity="error"
                icon={false}
                sx={{
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  background: 'rgba(231,76,60,0.08)',
                  color: '#c0392b',
                  border: '1px solid rgba(231,76,60,0.2)',
                  '& .MuiAlert-message': { display: 'flex', alignItems: 'center', gap: '0.4rem' },
                }}
              >
                <FiAlertCircle size={16} />
                {serverError}
              </Alert>
            )}

            <Button type="submit" disabled={isLoading} variant="contained" fullWidth sx={submitBtnSx}
              startIcon={!isLoading ? <FiLock size={18} /> : undefined}
            >
              {isLoading ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ResetPassword;
