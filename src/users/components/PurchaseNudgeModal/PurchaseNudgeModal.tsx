import { Dialog, DialogContent, IconButton, Zoom, Box, Button, useMediaQuery } from '@mui/material';
import { FiX } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import type { NudgeResponse } from '../../../services/orderService';

interface PurchaseNudgeModalProps {
  isOpen: boolean;
  busy: boolean;
  error: string | null;
  onRespond: (response: NudgeResponse) => void;
  onDismiss: () => void;
}

type OptionVariant = 'primary' | 'neutral' | 'danger';

const OPTIONS: { response: NudgeResponse; label: string; variant: OptionVariant }[] = [
  { response: 'confirmado', label: 'Sí, ya envié el comprobante', variant: 'primary' },
  { response: 'sin_confirmar', label: 'Todavía no lo envié', variant: 'neutral' },
  { response: 'abandonado', label: 'No, cancelar mi pedido', variant: 'danger' },
];

const VARIANT_SX: Record<OptionVariant, object> = {
  primary: { color: '#fff', background: '#10b981', '&:hover': { background: '#059669' } },
  neutral: { color: '#374151', background: '#f3f4f6', '&:hover': { background: '#e5e7eb' } },
  danger: { color: '#b91c1c', background: '#fef2f2', '&:hover': { background: '#fee2e2' } },
};

const PurchaseNudgeModal = ({ isOpen, busy, error, onRespond, onDismiss }: PurchaseNudgeModalProps) => {
  const isMobile = useMediaQuery('(max-width:479px)');

  return (
    <Dialog
      open={isOpen}
      onClose={() => { if (!busy) onDismiss(); }}
      maxWidth="xs"
      TransitionComponent={Zoom}
      transitionDuration={350}
      aria-labelledby="nudge-title"
      sx={{
        zIndex: 2100,
        '& .MuiBackdrop-root': { background: 'rgba(0,0,0,0.5)' },
        '& .MuiDialog-paper': {
          borderRadius: '12px',
          maxWidth: isMobile ? '90vw' : '420px',
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        },
      }}
    >
      <IconButton
        onClick={onDismiss}
        aria-label="Cerrar"
        disabled={busy}
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
          gap: '14px',
          p: isMobile ? '30px 20px' : '40px 30px',
        }}
      >
        <Box sx={{ display: 'flex' }}>
          <FaWhatsapp size={isMobile ? 40 : 48} color="#25D366" />
        </Box>
        <h3 id="nudge-title" style={{ fontSize: isMobile ? 18 : 20, fontWeight: 600, color: '#1f2937', margin: 0, lineHeight: 1.3 }}>
          ¿Pudiste completar tu compra?
        </h3>
        <p style={{ fontSize: isMobile ? 13 : 14, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
          Te abrimos WhatsApp con el detalle de tu pedido. Contanos cómo te fue para reservar tu
          stock o liberarlo si no seguís.
        </p>

        {error && (
          <p role="alert" style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>
            {error}
          </p>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, width: '100%', mt: 1 }}>
          {OPTIONS.map((opt) => (
            <Button
              key={opt.response}
              onClick={() => onRespond(opt.response)}
              disabled={busy}
              fullWidth
              sx={{
                py: 1.25,
                borderRadius: '8px',
                fontSize: 14,
                fontWeight: 600,
                textTransform: 'none',
                ...VARIANT_SX[opt.variant],
                '&.Mui-disabled': { opacity: 0.6 },
              }}
            >
              {opt.label}
            </Button>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseNudgeModal;
