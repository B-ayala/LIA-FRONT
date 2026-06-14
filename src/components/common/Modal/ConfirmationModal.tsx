import { Dialog, DialogContent, IconButton, Zoom, Box, Button, CircularProgress, useMediaQuery } from '@mui/material';
import { FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { keyframes } from '@emotion/react';

const scaleIn = keyframes`
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
`;

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  status?: 'success' | 'error' | 'info' | 'loading';
  actionButtonText?: string;
  onActionClick?: () => void;
  cancelButtonText?: string;
}

const statusColors: Record<string, { bg: string; hover: string; shadow: string }> = {
  success: { bg: '#10b981', hover: '#059669', shadow: 'rgba(16, 185, 129, 0.3)' },
  error: { bg: '#ef4444', hover: '#dc2626', shadow: 'rgba(239, 68, 68, 0.3)' },
  info: { bg: '#3b82f6', hover: '#2563eb', shadow: 'rgba(59, 130, 246, 0.3)' },
  loading: { bg: '#9ca3af', hover: '#9ca3af', shadow: 'none' },
};

const ConfirmationModal = ({
  isOpen,
  onClose,
  title,
  message,
  status = 'info',
  actionButtonText = 'Aceptar',
  onActionClick,
  cancelButtonText,
}: ConfirmationModalProps) => {
  const isMobile = useMediaQuery('(max-width:479px)');

  const getStatusIcon = () => {
    const iconSize = isMobile ? 40 : 48;
    switch (status) {
      case 'success':
        return (
          <Box sx={{ animation: `${scaleIn} 0.5s ease-out`, display: 'flex', mb: 1 }}>
            <FiCheckCircle size={iconSize} color="#10b981" />
          </Box>
        );
      case 'error':
        return (
          <Box sx={{ animation: `${shake} 0.5s ease-out`, display: 'flex', mb: 1 }}>
            <FiAlertCircle size={iconSize} color="#ef4444" />
          </Box>
        );
      case 'loading':
        return <CircularProgress size={50} sx={{ my: 1, color: '#667eea' }} />;
      default:
        return null;
    }
  };

  const handleActionClick = () => {
    if (onActionClick) {
      onActionClick();
    }
    onClose();
  };

  const colors = statusColors[status] || statusColors.info;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xs"
      TransitionComponent={Zoom}
      transitionDuration={350}
      sx={{
        zIndex: 2100,
        '& .MuiBackdrop-root': {
          background: 'rgba(0,0,0,0.5)',
        },
        '& .MuiDialog-paper': {
          borderRadius: '12px',
          maxWidth: isMobile ? '90vw' : '400px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
          position: 'relative',
        },
      }}
    >
      <IconButton
        onClick={onClose}
        aria-label="Cerrar"
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 32,
          height: 32,
          color: '#9ca3af',
          borderRadius: '6px',
          zIndex: 1,
          '&:hover': { background: '#f3f4f6', color: '#1f2937' },
        }}
      >
        <FiX size={20} />
      </IconButton>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          p: isMobile ? '30px 20px' : '40px 30px',
        }}
      >
        {getStatusIcon()}
        <h3 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 600, color: '#1f2937', margin: 0, lineHeight: 1.3 }}>
          {title}
        </h3>
        <p style={{ fontSize: isMobile ? 13 : 14, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
          {message}
        </p>
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexDirection: cancelButtonText ? 'row' : 'column', justifyContent: 'center' }}>
          {cancelButtonText && (
            <Button
              onClick={onClose}
              sx={{
                px: 3,
                py: 1.25,
                borderRadius: '6px',
                fontSize: 14,
                fontWeight: 600,
                minWidth: 120,
                textTransform: 'none',
                color: '#374151',
                background: '#f3f4f6',
                '&:hover': { background: '#e5e7eb' },
              }}
            >
              {cancelButtonText}
            </Button>
          )}
          <Button
            onClick={handleActionClick}
            disabled={status === 'loading'}
            sx={{
              px: 3,
              py: 1.25,
              borderRadius: '6px',
              fontSize: 14,
              fontWeight: 600,
              minWidth: 120,
              textTransform: 'none',
              color: 'white',
              background: colors.bg,
              '&:hover': {
                background: colors.hover,
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 12px ${colors.shadow}`,
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              '&.Mui-disabled': {
                background: '#9ca3af',
                color: 'white',
              },
            }}
          >
            {actionButtonText}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;
