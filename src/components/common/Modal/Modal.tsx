import { type ReactNode } from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Grow, useMediaQuery } from '@mui/material';
import { FiX } from 'react-icons/fi';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  const isMobile = useMediaQuery('(max-width:639px)');

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth={false}
      TransitionComponent={Grow}
      transitionDuration={{ enter: 200, exit: 150 }}
      sx={{
        zIndex: 2000,
        '& .MuiBackdrop-root': {
          background: 'rgba(0,0,0,0.45)',
        },
        '& .MuiDialog-paper': {
          background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
          borderRadius: isMobile ? 0 : '20px',
          boxShadow: '0 25px 80px -20px rgba(184,165,200,0.4), 0 15px 40px -10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
          border: '1px solid rgba(255,255,255,0.6)',
          overflow: 'hidden',
          position: 'relative',
          maxWidth: '560px',
          maxHeight: isMobile ? '100vh' : '85vh',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, var(--primary-color) 0%, var(--primary-light) 50%, var(--primary-color) 100%)',
            borderRadius: isMobile ? 0 : '20px 20px 0 0',
            zIndex: 1,
          },
          '@media (min-width: 768px)': {
            maxWidth: '680px',
          },
          '@media (min-width: 1024px)': {
            maxWidth: '760px',
            boxShadow: '0 30px 100px -25px rgba(184,165,200,0.45), 0 20px 50px -15px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)',
          },
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: title ? 'space-between' : 'flex-end',
          p: title
            ? (isMobile ? '1.25rem 1.5rem' : '1.5rem 2rem')
            : (isMobile ? '0.75rem 1rem 0' : '0.75rem 1.25rem 0'),
          borderBottom: title ? '1px solid rgba(184,165,200,0.2)' : 'none',
          background: title
            ? 'linear-gradient(135deg, rgba(184,165,200,0.08) 0%, rgba(255,255,255,0.9) 100%)'
            : 'transparent',
          flexShrink: 0,
        }}
      >
        {title && (
          <h3
            style={{
              margin: 0,
              fontFamily: "'Poppins', sans-serif",
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #333 0%, #666 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {title}
          </h3>
        )}
        <IconButton
          onClick={onClose}
          aria-label="Cerrar"
          sx={{
            background: 'rgba(184,165,200,0.1)',
            borderRadius: isMobile ? '12px' : '14px',
            minWidth: isMobile ? 44 : 48,
            minHeight: isMobile ? 44 : 48,
            color: '#888',
            fontSize: '1.5rem',
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            '&:hover': {
              color: 'white',
              transform: 'rotate(90deg) scale(1.05)',
              boxShadow: '0 4px 15px rgba(184,165,200,0.4)',
              background: 'var(--primary-color)',
            },
            '&:active': {
              transform: 'rotate(90deg) scale(0.95)',
            },
          }}
        >
          <FiX />
        </IconButton>
      </DialogTitle>
      <DialogContent
        className="modal-body"
        sx={{
          p: isMobile ? '1.5rem' : '2rem',
          overflowY: 'auto',
          color: 'var(--text-light)',
          fontSize: '1rem',
          lineHeight: 1.7,
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { background: 'rgba(184,165,200,0.1)', borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb': { background: 'var(--primary-color)', borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb:hover': { background: 'var(--primary-dark)' },
          '& p': { mb: '1.25rem', color: 'var(--text-light)' },
          '& p:last-child': { mb: 0 },
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
