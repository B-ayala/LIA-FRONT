import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, Grow, Box, Typography, Stack, Button,
  useMediaQuery, Tabs, Tab, TextField, Alert, Link, InputAdornment, IconButton,
} from '@mui/material';
import { FcGoogle } from 'react-icons/fc';
import {
  FiLogIn, FiUserPlus, FiAlertCircle, FiCheckCircle, FiMail, FiArrowRight, FiMessageSquare,
  FiEye, FiEyeOff, FiPhone,
} from 'react-icons/fi';
import { useAuthStore } from '../../../store/authStore';
import { isValidEmail, validatePassword, validatePasswordMatch, validatePhone } from '../../../utils/validation';
import { extractErrorMessage } from '../../../utils/errorMessage';
import { createUser, resendConfirmationEmail, requestPasswordReset } from '../../../services/userService';
import { signInWithGoogle } from '../../../services/authService';
import Modal from '../../../components/common/Modal/Modal';
import { EMAIL_CONFIRMED_CHANNEL, EMAIL_CONFIRMED_STORAGE_KEY } from '../../pages/auth/EmailConfirmation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const labelSx = {
  fontSize: '0.875rem',
  color: 'var(--text-dark)',
  fontWeight: 500,
  letterSpacing: '-0.01em',
  display: 'block',
  mb: 0.5,
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    fontFamily: "'Poppins', sans-serif",
    color: 'var(--text-dark)',
    background: '#fff',
    '& fieldset': {
      borderColor: 'rgba(184,165,200,0.25)',
      borderWidth: 2,
    },
    '&:hover fieldset': { borderColor: 'rgba(184,165,200,0.4)' },
    '&.Mui-focused': {
      boxShadow: '0 0 0 4px rgba(184,165,200,0.15), 0 4px 12px rgba(184,165,200,0.1)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'var(--primary-color)',
      borderWidth: 2,
    },
    '&.Mui-error': {
      background: 'rgba(231,76,60,0.05)',
      boxShadow: '0 0 0 4px rgba(231,76,60,0.1)',
    },
    '&.Mui-error fieldset': { borderColor: '#e74c3c' },
  },
  '& .MuiOutlinedInput-input': {
    padding: { xs: '0.8rem 1rem', sm: '0.9rem 1.1rem', md: '1rem 1.25rem' },
    fontSize: { xs: '0.95rem', sm: '1rem' },
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
  py: { xs: '0.85rem', sm: '1rem', md: '1.1rem' },
  fontSize: { xs: '0.95rem', sm: '1rem' },
  fontWeight: 600,
  textTransform: 'none' as const,
  fontFamily: "'Poppins', sans-serif",
  mt: 0.5,
  gap: '0.5rem',
  boxShadow: '0 4px 15px rgba(184,165,200,0.4)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
  '&:hover': {
    background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
    boxShadow: '0 6px 25px rgba(184,165,200,0.5)',
    transform: 'translateY(-2px)',
  },
  '&:active': {
    transform: 'translateY(0) scale(0.98)',
    boxShadow: '0 2px 10px rgba(184,165,200,0.4)',
  },
  '&.Mui-disabled': {
    opacity: 0.65,
    color: 'white',
    background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
  },
};

const alertErrorSx = {
  borderRadius: '10px',
  fontSize: '0.875rem',
  fontWeight: 500,
  background: 'rgba(231,76,60,0.08)',
  color: '#c0392b',
  border: '1px solid rgba(231,76,60,0.2)',
  py: '0.5rem',
  '& .MuiAlert-message': {
    textAlign: 'center',
    width: '100%',
    p: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
  },
  '& .MuiAlert-icon': { display: 'none' },
};

const alertSuccessSx = {
  borderRadius: '10px',
  fontSize: '0.875rem',
  fontWeight: 500,
  background: 'rgba(46,204,113,0.08)',
  color: '#27ae60',
  border: '1px solid rgba(46,204,113,0.2)',
  py: '0.5rem',
  '& .MuiAlert-message': {
    textAlign: 'center',
    p: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
  },
  '& .MuiAlert-icon': { display: 'none' },
};

const resendBtnSx = {
  background: '#3498db',
  color: 'white',
  borderRadius: '8px',
  px: 2,
  py: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  textTransform: 'none' as const,
  fontFamily: "'Poppins', sans-serif",
  gap: '0.4rem',
  boxShadow: '0 2px 8px rgba(52,152,219,0.3)',
  mt: '0.25rem',
  '&:hover': {
    background: '#2980b9',
    boxShadow: '0 4px 12px rgba(52,152,219,0.4)',
    transform: 'translateY(-1px)',
  },
  '&:active': {
    transform: 'translateY(0)',
    boxShadow: '0 1px 4px rgba(52,152,219,0.3)',
  },
  '&.Mui-disabled': {
    opacity: 0.65,
    color: 'white',
    background: '#3498db',
  },
};

const googleBtnSx = {
  background: '#fff',
  color: 'var(--text-dark)',
  border: '2px solid rgba(184,165,200,0.25)',
  borderRadius: '12px',
  py: { xs: '0.85rem', sm: '0.9rem', md: '1.1rem' },
  fontSize: { xs: '0.95rem', sm: '1rem' },
  fontWeight: 500,
  textTransform: 'none' as const,
  fontFamily: "'Poppins', sans-serif",
  gap: '0.75rem',
  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
  '&:hover': {
    background: '#fff',
    borderColor: 'var(--primary-color)',
    boxShadow: '0 4px 15px rgba(184,165,200,0.2)',
    transform: 'translateY(-2px)',
    '& .MuiButton-startIcon': { transform: 'scale(1.1)' },
  },
  '& .MuiButton-startIcon': { transition: 'transform 0.3s ease' },
  '&:active': { transform: 'translateY(0) scale(0.98)' },
};

const fieldError = (msg?: string) =>
  msg ? (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <FiAlertCircle size={13} />
      {msg}
    </Box>
  ) : undefined;

const AuthModal = ({ isOpen, onClose, onSuccess }: AuthModalProps) => {
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const isMobile = useMediaQuery('(max-width:639px)');
  const [view, setView] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // Password visibility
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Loading & server feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [emailErrorType, setEmailErrorType] = useState<'confirmed' | 'pending' | null>(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Email confirmation modal state
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const [confirmationError, setConfirmationError] = useState('');
  const [emailActuallySent, setEmailActuallySent] = useState(false);
  const [emailConfirmedByLink, setEmailConfirmedByLink] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Escuchar confirmación de email desde la otra pestaña
  useEffect(() => {
    if (!isOpen) return;

    const applyEmailConfirmed = () => {
      setShowConfirmationModal(false);
      setConfirmationError('');
      setEmailActuallySent(false);
      setEmailConfirmedByLink(true);
      setView('login');
    };

    const consumeStoredConfirmation = () => {
      try {
        const rawValue = window.localStorage.getItem(EMAIL_CONFIRMED_STORAGE_KEY);
        if (!rawValue) return false;

        const parsed = JSON.parse(rawValue) as { type?: string };
        if (parsed?.type !== 'EMAIL_CONFIRMED') return false;

        window.localStorage.removeItem(EMAIL_CONFIRMED_STORAGE_KEY);
        return true;
      } catch {
        return false;
      }
    };

    if (consumeStoredConfirmation()) {
      applyEmailConfirmed();
    }

    let channel: BroadcastChannel | null = null;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== EMAIL_CONFIRMED_STORAGE_KEY || !event.newValue) return;
      if (consumeStoredConfirmation()) {
        applyEmailConfirmed();
      }
    };

    try {
      channel = new BroadcastChannel(EMAIL_CONFIRMED_CHANNEL);
      channel.onmessage = (e) => {
        if (e.data?.type === 'EMAIL_CONFIRMED') {
          applyEmailConfirmed();
        }
      };
    } catch { /* BroadcastChannel not supported */ }
    window.addEventListener('storage', onStorage);

    return () => {
      channel?.close();
      window.removeEventListener('storage', onStorage);
    };
  }, [isOpen]);

  // Reset state when closing
  const handleClose = () => {
    setLoginEmail('');
    setLoginPassword('');
    setRegisterName('');
    setRegisterEmail('');
    setRegisterPhone('');
    setRegisterPassword('');
    setRegisterConfirmPassword('');
    setErrors({});
    setServerError('');
    setSuccessMessage('');
    setEmailErrorType(null);
    setView('login');
    setForgotEmail('');
    setForgotSent(false);
    setShowForgotModal(false);
    setShowConfirmationModal(false);
    setConfirmedEmail('');
    setConfirmationError('');
    setEmailConfirmedByLink(false);
    // Ensure small timeout to not show reset during fade out animation
    setTimeout(() => {
        onClose();
    }, 50);
  };

  const validateLogin = () => {
    const newErrors: Record<string, string> = {};
    if (!loginEmail.trim()) newErrors.loginEmail = 'El correo electrónico es requerido';
    else if (!isValidEmail(loginEmail)) newErrors.loginEmail = 'Ingresa un correo válido';

    if (!loginPassword.trim()) newErrors.loginPassword = 'La contraseña es requerida';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegister = () => {
    const newErrors: Record<string, string> = {};
    if (!registerName.trim()) newErrors.registerName = 'El nombre es requerido';

    if (!registerEmail.trim()) newErrors.registerEmail = 'El correo electrónico es requerido';
    else if (!isValidEmail(registerEmail)) newErrors.registerEmail = 'Ingresa un correo válido';

    const phoneError = validatePhone(registerPhone);
    if (phoneError) newErrors.registerPhone = phoneError;

    const pwdError = validatePassword(registerPassword);
    if (pwdError) newErrors.registerPassword = pwdError;

    const matchError = validatePasswordMatch(registerPassword, registerConfirmPassword);
    if (matchError) newErrors.registerConfirmPassword = matchError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateLogin()) return;

    setServerError('');
    setIsLoading(true);
    try {
      const isAdmin = await login(loginEmail, loginPassword);
      if (isAdmin) {
        onClose();
        navigate('/admin', { replace: true });
        return;
      }
      // Login exitoso pero no es admin — cerrar modal normalmente
      onSuccess?.();
      handleClose();
    } catch (err) {
      setServerError(extractErrorMessage(err, 'No pudimos iniciar sesión. Verificá tus datos e intentá de nuevo.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setServerError('');
    setIsGoogleLoading(true);
    try {
      // Redirige a Google; si no tira error acá, el navegador ya está navegando afuera.
      await signInWithGoogle();
    } catch (err) {
      setServerError(extractErrorMessage(err, 'No pudimos iniciar sesión con Google. Intentá de nuevo.'));
      setIsGoogleLoading(false);
    }
  };

  const handleForgotSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !isValidEmail(forgotEmail)) {
      setErrors({ forgotEmail: 'Ingresá un correo electrónico válido' });
      return;
    }
    setErrors({});
    setServerError('');
    setIsLoading(true);
    try {
      await requestPasswordReset(forgotEmail.trim());
      setForgotSent(true);
    } catch (err) {
      setServerError(extractErrorMessage(err, 'Error al enviar el email'));
    } finally {
      setIsLoading(false);
    }
  };

  const startResendCooldown = (seconds: number) => {
    setResendCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');
    setEmailErrorType(null);

    if (!validateRegister()) return;

    setIsLoading(true);
    try {
      await createUser({
        name: registerName.trim(),
        email: registerEmail.trim(),
        phone: registerPhone.trim(),
        password: registerPassword,
      });

      // Mostrar modal de confirmación en lugar de redirigir automáticamente
      setConfirmedEmail(registerEmail.trim());
      setEmailActuallySent(true);
      setShowConfirmationModal(true);
      setConfirmationError('');
      startResendCooldown(60);

      // Limpiar formulario
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al registrar el usuario';
      if (message === 'EMAIL_ALREADY_CONFIRMED') {
        setEmailErrorType('confirmed');
        setServerError('confirmed');
      } else if (message === 'EMAIL_PENDING_CONFIRMATION') {
        setEmailErrorType('pending');
        setServerError('pending');
      } else if (message.startsWith('SIGNUP_RATE_LIMIT:')) {
        setConfirmedEmail(registerEmail.trim());
        setEmailActuallySent(false);
        setShowConfirmationModal(true);
        setConfirmationError('');
      } else {
        setEmailErrorType(null);
        setServerError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!registerEmail.trim() || !isValidEmail(registerEmail)) {
      setServerError('Por favor ingresa un correo electrónico válido');
      return;
    }

    setIsResendingEmail(true);
    setServerError('');
    try {
      const result = await resendConfirmationEmail(registerEmail.trim());
      setSuccessMessage(result.message);
      setTimeout(() => {
        setSuccessMessage('');
        setView('login');
      }, 4000);
      setRegisterEmail('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al reenviar el email';
      setServerError(message);
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleResendEmailFromConfirmation = async () => {
    if (!confirmedEmail.trim()) {
      setConfirmationError('Error al reenviar. Por favor intenta nuevamente.');
      return;
    }

    setIsResendingEmail(true);
    setConfirmationError('');
    try {
      await resendConfirmationEmail(confirmedEmail);
      setConfirmationError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al reenviar el email';
      if (message.startsWith('RESEND_COOLDOWN:')) {
        const seconds = parseInt(message.split(':')[1], 10) || 60;
        startResendCooldown(seconds);
        setConfirmationError('');
      } else {
        setConfirmationError(message);
      }
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleCloseConfirmationModal = () => {
    setShowConfirmationModal(false);
    setConfirmedEmail('');
    setConfirmationError('');
    setEmailActuallySent(false);
    setResendCooldown(0);
    if (cooldownRef.current) { clearInterval(cooldownRef.current); cooldownRef.current = null; }
    setView('login');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="">
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>

        {/* Tabs */}
        <Tabs
          value={view}
          onChange={(_, v) => {
            setErrors({});
            setServerError('');
            setSuccessMessage('');
            setEmailErrorType(null);
            setEmailConfirmedByLink(false);
            setForgotEmail('');
            setForgotSent(false);
            setView(v as 'login' | 'register');
          }}
          variant="fullWidth"
          sx={{
            borderBottom: '2px solid rgba(184,165,200,0.25)',
            mb: { xs: '1.75rem', sm: '2rem' },
            mt: 0.5,
            minHeight: 'auto',
            '& .MuiTab-root': {
              fontFamily: "'Poppins', sans-serif",
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
              fontWeight: 500,
              color: '#888',
              textTransform: 'none',
              minWidth: 0,
              minHeight: 'auto',
              borderRadius: '8px 8px 0 0',
              py: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
              px: { xs: '0.3rem', sm: '0.5rem', md: '1rem' },
              gap: '0.4rem',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              '& .MuiTab-iconWrapper': { mb: 0 },
              '&:hover': {
                color: 'var(--primary-dark)',
                background: 'rgba(184,165,200,0.08)',
              },
              '&.Mui-selected': {
                color: 'var(--primary-dark)',
                fontWeight: 600,
                background: 'rgba(184,165,200,0.12)',
              },
            },
            '& .MuiTabs-indicator': {
              background: 'linear-gradient(90deg, var(--primary-color) 0%, var(--primary-light) 50%, var(--primary-color) 100%)',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab icon={<FiLogIn size={16} />} iconPosition="start" label="Iniciar Sesión" value="login" />
          <Tab icon={<FiUserPlus size={16} />} iconPosition="start" label="Crear Cuenta" value="register" />
        </Tabs>

        {/* Form content */}
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {view === 'login' ? (
            <Box component="form" onSubmit={handleLoginSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <Stack spacing={0.5}>
                <Typography component="label" htmlFor="loginEmail" sx={labelSx}>
                  Correo Electrónico
                </Typography>
                <TextField
                  id="loginEmail"
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  error={!!errors.loginEmail}
                  helperText={fieldError(errors.loginEmail)}
                  variant="outlined"
                  fullWidth
                  sx={inputSx}
                />
              </Stack>

              <Stack spacing={0.5}>
                <Typography component="label" htmlFor="loginPassword" sx={labelSx}>
                  Contraseña
                </Typography>
                <TextField
                  id="loginPassword"
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  error={!!errors.loginPassword}
                  helperText={fieldError(errors.loginPassword)}
                  variant="outlined"
                  fullWidth
                  sx={inputSx}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowLoginPassword(p => !p)}
                            edge="end"
                            size="small"
                            tabIndex={-1}
                          >
                            {showLoginPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Stack>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: '-0.25rem' }}>
                <Link
                  component="button"
                  type="button"
                  underline="none"
                  onClick={() => { setErrors({}); setServerError(''); setForgotEmail(''); setForgotSent(false); setShowForgotModal(true); }}
                  sx={{
                    fontSize: '0.875rem',
                    color: 'var(--primary-dark)',
                    fontWeight: 500,
                    position: 'relative',
                    transition: 'color 0.2s ease',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    '&:hover': { color: 'var(--primary-color)' },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: '-2px',
                      left: 0,
                      width: 0,
                      height: '1px',
                      background: 'var(--primary-color)',
                      transition: 'width 0.3s ease',
                    },
                    '&:hover::after': { width: '100%' },
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </Box>

              {emailConfirmedByLink && (
                <Alert severity="success" icon={false} sx={alertSuccessSx}>
                  <FiCheckCircle size={16} />
                  Tu cuenta fue confirmada correctamente. Ya podés iniciar sesión.
                </Alert>
              )}

              {serverError && (
                <Alert severity="error" icon={<FiAlertCircle size={18} />} sx={alertErrorSx}>
                  {serverError}
                </Alert>
              )}

              <Button type="submit" disabled={isLoading} variant="contained" fullWidth sx={submitBtnSx}
                startIcon={!isLoading ? <FiLogIn size={18} /> : undefined}
              >
                {isLoading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleRegisterSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <Stack spacing={0.5}>
                <Typography component="label" htmlFor="registerName" sx={labelSx}>
                  Nombre Completo
                </Typography>
                <TextField
                  id="registerName"
                  type="text"
                  autoComplete="name"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  error={!!errors.registerName}
                  helperText={fieldError(errors.registerName)}
                  variant="outlined"
                  fullWidth
                  sx={inputSx}
                />
              </Stack>

              <Stack spacing={0.5}>
                <Typography component="label" htmlFor="registerEmail" sx={labelSx}>
                  Correo Electrónico
                </Typography>
                <TextField
                  id="registerEmail"
                  type="email"
                  autoComplete="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  error={!!errors.registerEmail}
                  helperText={fieldError(errors.registerEmail)}
                  variant="outlined"
                  fullWidth
                  sx={inputSx}
                />
              </Stack>

              <Stack spacing={0.5}>
                <Typography component="label" htmlFor="registerPhone" sx={labelSx}>
                  Número de Celular
                </Typography>
                <TextField
                  id="registerPhone"
                  type="tel"
                  autoComplete="tel"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  error={!!errors.registerPhone}
                  helperText={fieldError(errors.registerPhone)}
                  variant="outlined"
                  fullWidth
                  sx={inputSx}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <FiPhone size={16} color="var(--primary-color)" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Stack>

              <Stack spacing={0.5}>
                <Typography component="label" htmlFor="registerPassword" sx={labelSx}>
                  Contraseña
                </Typography>
                <TextField
                  id="registerPassword"
                  type={showRegisterPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  error={!!errors.registerPassword}
                  helperText={fieldError(errors.registerPassword)}
                  variant="outlined"
                  fullWidth
                  sx={inputSx}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowRegisterPassword(p => !p)}
                            edge="end"
                            size="small"
                            tabIndex={-1}
                          >
                            {showRegisterPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Stack>

              <Stack spacing={0.5}>
                <Typography component="label" htmlFor="registerConfirmPassword" sx={labelSx}>
                  Confirmar Contraseña
                </Typography>
                <TextField
                  id="registerConfirmPassword"
                  type={showRegisterConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  error={!!errors.registerConfirmPassword}
                  helperText={fieldError(errors.registerConfirmPassword)}
                  variant="outlined"
                  fullWidth
                  sx={inputSx}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowRegisterConfirmPassword(p => !p)}
                            edge="end"
                            size="small"
                            tabIndex={-1}
                          >
                            {showRegisterConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Stack>

              {emailErrorType === 'confirmed' && (
                <Alert severity="error" icon={<FiAlertCircle size={18} />} sx={alertErrorSx}>
                  <Box>Ya existe una cuenta con este correo. ¿Querés iniciar sesión?</Box>
                  <Button
                    type="button"
                    onClick={() => { setServerError(''); setEmailErrorType(null); setView('login'); }}
                    startIcon={<FiLogIn size={15} />}
                    sx={resendBtnSx}
                  >
                    Ir a Iniciar sesión
                  </Button>
                </Alert>
              )}
              {emailErrorType === 'pending' && (
                <Alert severity="error" icon={<FiAlertCircle size={18} />} sx={alertErrorSx}>
                    <Box>Ese correo ya se encuentra registrado. Si todavia no confirmaste la cuenta, revisa tu bandeja de entrada (o spam).</Box>
                  <Button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={isResendingEmail}
                    startIcon={<FiMail size={15} />}
                    sx={resendBtnSx}
                  >
                    {isResendingEmail ? 'Reenviando...' : 'Reenviar email de confirmación'}
                  </Button>
                </Alert>
              )}
              {!emailErrorType && serverError && (
                <Alert severity="error" icon={<FiAlertCircle size={18} />} sx={alertErrorSx}>
                  {serverError}
                </Alert>
              )}
              {successMessage && (
                <Alert severity="success" icon={false} sx={alertSuccessSx}>
                  <FiCheckCircle size={16} />
                  {successMessage}
                </Alert>
              )}

              <Button type="submit" disabled={isLoading} variant="contained" fullWidth sx={submitBtnSx}
                startIcon={!isLoading ? <FiUserPlus size={18} /> : undefined}
              >
                {isLoading ? 'Registrando...' : 'Registrarse'}
              </Button>
            </Box>
          )}

          {/* Separator + Google */}
          <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              my: '1.75rem',
              color: '#888',
              fontSize: '0.875rem',
              fontWeight: 500,
              '&::before': {
                content: '""',
                flex: 1,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(184,165,200,0.4), transparent)',
              },
              '&::after': {
                content: '""',
                flex: 1,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(184,165,200,0.4), transparent)',
              },
            }}
          >
            <Box
              component="span"
              sx={{
                px: '1.25rem',
                background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
                borderRadius: '20px',
                mx: '0.5rem',
              }}
            >
              O continuar con
            </Box>
          </Box>

          {/* Google button */}
          <Button
            type="button"
            variant="outlined"
            fullWidth
            disabled={isGoogleLoading}
            onClick={handleGoogleLogin}
            startIcon={<FcGoogle style={{ fontSize: '1.25rem', flexShrink: 0 }} />}
            endIcon={<FiArrowRight size={16} />}
            sx={googleBtnSx}
          >
            {isGoogleLoading ? 'Conectando con Google...' : 'Continuar con Google'}
          </Button>
          </Box>
        </Box>
      </Box>

      {/* Modal de recuperación de contraseña */}
      <Dialog
        open={showForgotModal}
        onClose={() => { setShowForgotModal(false); setForgotEmail(''); setForgotSent(false); setErrors({}); setServerError(''); }}
        fullScreen={isMobile}
        fullWidth
        maxWidth={false}
        slots={{ transition: Grow }}
        slotProps={{ transition: { timeout: 200 } }}
        sx={{
          zIndex: 2100,
          '& .MuiBackdrop-root': {
            background: 'linear-gradient(135deg, rgba(184,165,200,0.35) 0%, rgba(0,0,0,0.45) 100%)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          },
          '& .MuiDialog-paper': {
            background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
            borderRadius: isMobile ? 0 : '20px',
            boxShadow: '0 25px 80px -20px rgba(184,165,200,0.4), 0 15px 40px -10px rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.6)',
            overflow: 'hidden',
            position: 'relative',
            maxWidth: '480px',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, var(--primary-color) 0%, var(--primary-light) 50%, var(--primary-color) 100%)',
              zIndex: 1,
            },
          },
        }}
      >
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: '1rem', sm: '1.25rem' },
            p: { xs: '1.75rem 1.25rem', sm: '2rem 1.75rem' },
          }}
        >
          {forgotSent ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', py: 1, textAlign: 'center' }}>
              <Box
                sx={{
                  width: { xs: 56, sm: 64 },
                  height: { xs: 56, sm: 64 },
                  borderRadius: '50%',
                  background: 'rgba(46,204,113,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FiCheckCircle size={30} color="#27ae60" />
              </Box>

              <Typography sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 700, color: 'var(--text-dark)' }}>
                ¡Email enviado!
              </Typography>

              <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, color: '#666', lineHeight: 1.5, maxWidth: 340 }}>
                Revisá tu bandeja de entrada (y carpeta de spam). Si el correo existe en nuestra base, recibirás el link en breve.
              </Typography>

              <Button
                variant="outlined"
                fullWidth
                onClick={() => { setShowForgotModal(false); setForgotEmail(''); setForgotSent(false); }}
                startIcon={<FiLogIn size={16} />}
                sx={{
                  mt: 1,
                  color: 'var(--primary-dark)',
                  borderColor: 'var(--primary-color)',
                  borderWidth: 2,
                  borderRadius: '10px',
                  py: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'none' as const,
                  fontFamily: "'Poppins', sans-serif",
                  '&:hover': { background: 'rgba(184,165,200,0.08)', borderColor: 'var(--primary-color)', borderWidth: 2 },
                }}
              >
                Volver a Iniciar Sesión
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleForgotSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Box>
                <Typography sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 700, color: 'var(--text-dark)', mb: 0.5 }}>
                  Recuperar contraseña
                </Typography>
                <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, color: '#888' }}>
                  Ingresá tu correo y te enviaremos un link para restablecer tu contraseña.
                </Typography>
              </Box>

              <Stack spacing={0.5}>
                <Typography component="label" htmlFor="forgotEmailModal" sx={labelSx}>
                  Correo Electrónico
                </Typography>
                <TextField
                  id="forgotEmailModal"
                  type="email"
                  autoComplete="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  error={!!errors.forgotEmail}
                  helperText={fieldError(errors.forgotEmail)}
                  variant="outlined"
                  fullWidth
                  sx={inputSx}
                />
              </Stack>

              {serverError && (
                <Alert severity="error" icon={<FiAlertCircle size={18} />} sx={alertErrorSx}>
                  {serverError}
                </Alert>
              )}

              <Button type="submit" disabled={isLoading} variant="contained" fullWidth sx={submitBtnSx}
                startIcon={!isLoading ? <FiMail size={18} /> : undefined}
              >
                {isLoading ? 'Enviando...' : 'Enviar link de recuperación'}
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de email */}
      <Dialog
        open={showConfirmationModal}
        onClose={handleCloseConfirmationModal}
        fullScreen={isMobile}
        fullWidth
        maxWidth={false}
        slots={{ transition: Grow }}
        slotProps={{ transition: { timeout: 200 } }}
        sx={{
          zIndex: 2100,
          '& .MuiBackdrop-root': {
            background: 'linear-gradient(135deg, rgba(184,165,200,0.35) 0%, rgba(0,0,0,0.45) 100%)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          },
          '& .MuiDialog-paper': {
            background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
            borderRadius: isMobile ? 0 : '20px',
            boxShadow: '0 25px 80px -20px rgba(184,165,200,0.4), 0 15px 40px -10px rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.6)',
            overflow: 'hidden',
            position: 'relative',
            maxWidth: '480px',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, var(--primary-color) 0%, var(--primary-light) 50%, var(--primary-color) 100%)',
              zIndex: 1,
            },
          },
        }}
      >
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: { xs: '0.75rem', sm: '1rem' },
            p: { xs: '1.5rem 1rem', sm: '2rem 1.5rem' },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: { xs: 60, sm: 70 },
              height: { xs: 60, sm: 70 },
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.1))',
              flexShrink: 0,
            }}
          >
            <FiMessageSquare
              size={40}
              style={{
                color: 'var(--primary-color)',
              }}
            />
          </Box>

          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: 'var(--text-dark)',
              fontFamily: "'Poppins', sans-serif",
              fontSize: { xs: '1.1rem', sm: '1.3rem' },
              lineHeight: 1.2,
            }}
          >
            Revisa tu correo electrónico
          </Typography>

          <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' }, color: '#666', fontWeight: 500 }}>
            {emailActuallySent
              ? 'Hemos enviado un enlace de confirmación a:'
              : 'Tu cuenta fue creada, pero no pudimos enviar el email de confirmación a:'}
          </Typography>

          <Box
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              color: 'var(--primary-color)',
            fontWeight: 600,
              background: 'rgba(102,126,234,0.08)',
              p: { xs: '0.5rem 0.75rem', sm: '0.6rem 1rem' },
              borderRadius: '6px',
              wordBreak: 'break-all',
              fontFamily: "'Courier New', monospace",
              overflowWrap: 'break-word',
              maxWidth: '100%',
            }}
          >
            {confirmedEmail}
          </Box>

          <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.85rem' }, color: '#999', lineHeight: 1.4, mt: 0.5 }}>
            {emailActuallySent
              ? 'Haz clic en el enlace dentro del email para confirmar tu cuenta y activarla.'
              : 'Se alcanzó el límite de envíos. Usá el botón de abajo para reenviar el email cuando estés listo.'}
          </Typography>

          {confirmationError && (
            <Box
              sx={{
                background: 'rgba(231,76,60,0.08)',
                color: '#c0392b',
                border: '1px solid rgba(231,76,60,0.2)',
                borderRadius: '6px',
                p: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                mt: 0.5,
                width: '100%',
              }}
            >
              {confirmationError}
            </Box>
          )}

          <Stack direction="column" spacing={1} sx={{ width: '100%', mt: 1 }}>
            <Button
              onClick={handleResendEmailFromConfirmation}
              disabled={isResendingEmail || resendCooldown > 0}
              variant="contained"
              fullWidth
              startIcon={<FiMail size={16} />}
              sx={{
                background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                borderRadius: '8px',
                py: { xs: '0.65rem', sm: '0.75rem' },
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                fontWeight: 600,
                textTransform: 'none',
                fontFamily: "'Poppins', sans-serif",
                boxShadow: '0 2px 8px rgba(52,152,219,0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #2980b9 0%, #2471a3 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(52,152,219,0.4)',
                },
                '&:active': { transform: 'scale(0.98)' },
                '&.Mui-disabled': { opacity: 0.65, color: 'white', background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' },
              }}
            >
              {isResendingEmail
                ? 'Reenviando...'
                : resendCooldown > 0
                  ? `Podés reenviar en ${resendCooldown}s`
                  : '¿No te llegó el correo? Reenviar'}
            </Button>

            <Button
              onClick={handleCloseConfirmationModal}
              variant="outlined"
              fullWidth
              startIcon={<FiLogIn size={16} />}
              sx={{
                color: 'var(--primary-dark)',
                borderColor: 'var(--primary-color)',
                borderWidth: 2,
                borderRadius: '8px',
                py: { xs: '0.65rem', sm: '0.75rem' },
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                fontWeight: 600,
                textTransform: 'none',
                fontFamily: "'Poppins', sans-serif",
                '&:hover': {
                  background: 'rgba(102,126,234,0.08)',
                  borderColor: 'var(--primary-color)',
                  borderWidth: 2,
                  transform: 'translateY(-1px)',
                },
                '&:active': { transform: 'scale(0.98)' },
              }}
            >
              Volver a Iniciar Sesión
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Modal>
  );
};

export default AuthModal;
