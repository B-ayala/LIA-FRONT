import { TextField } from '@mui/material';
import { SHIPPING_INFO_MAX_LENGTH, type ShippingInfo } from '../../../services/shippingInfoService';

interface ShippingInfoFieldsProps {
  values: ShippingInfo;
  onChange: (patch: Partial<ShippingInfo>) => void;
}

const maxLengthProps = { htmlInput: { maxLength: SHIPPING_INFO_MAX_LENGTH } };

const ShippingInfoFields = ({ values, onChange }: ShippingInfoFieldsProps) => (
  <>
    <h3 className="footer-editor-section-title">Entrega</h3>
    <p className="footer-editor-section-hint">
      Se muestran en el checkout y en la pantalla de pago aprobado. Un campo vacío vuelve al texto por defecto.
    </p>
    <div className="form-group">
      <TextField
        label="Horario de retiro en el local"
        value={values.pickupHours}
        onChange={(e) => onChange({ pickupHours: e.target.value })}
        helperText="Se lee como “Horario: …”. Ej: lunes a viernes de 10 a 19 hs"
        slotProps={maxLengthProps}
        fullWidth
        size="small"
      />
    </div>
    <div className="footer-editor-grid">
      <div className="form-group">
        <TextField
          label="Correo: despacho"
          value={values.correoDispatch}
          onChange={(e) => onChange({ correoDispatch: e.target.value })}
          slotProps={maxLengthProps}
          fullWidth
          size="small"
        />
      </div>
      <div className="form-group">
        <TextField
          label="Correo: plazo de entrega"
          value={values.correoDelivery}
          onChange={(e) => onChange({ correoDelivery: e.target.value })}
          slotProps={maxLengthProps}
          fullWidth
          size="small"
        />
      </div>
    </div>
    <h3 className="footer-editor-section-title">Cómo avisamos la entrega</h3>
    <div className="form-group">
      <TextField
        label="Texto de la página Contacto"
        value={values.contactNote}
        onChange={(e) => onChange({ contactNote: e.target.value })}
        helperText="Párrafo que ven los clientes en Contacto."
        slotProps={maxLengthProps}
        fullWidth
        size="small"
        multiline
      />
    </div>
    <div className="form-group">
      <TextField
        label="Entrega, en pocas palabras (para Google)"
        value={values.shippingSummary}
        onChange={(e) => onChange({ shippingSummary: e.target.value })}
        helperText="Aparece en las descripciones del sitio como “… con retiro en nuestro local”. Ej: envío a todo el país"
        slotProps={maxLengthProps}
        fullWidth
        size="small"
      />
    </div>
    <p className="footer-editor-section-hint">
      El envío por Correo Argentino sigue deshabilitado en el checkout; estos textos se ven cuando se habilite.
    </p>
  </>
);

export default ShippingInfoFields;
