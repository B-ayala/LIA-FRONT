import { useState } from 'react';
import { TextField } from '@mui/material';
import {
  LEGAL_FIELD_MAX,
  getLegalFooterErrors,
  parseDataFiscalCode,
  type LegalFooterValues,
} from '../../../utils/legalFooter';

export interface DataFiscalValue {
  dataFiscalUrl: string;
  dataFiscalImageUrl: string;
}

interface LegalFooterFieldsProps {
  values: LegalFooterValues;
  dataFiscal: DataFiscalValue;
  onChange: (patch: Partial<LegalFooterValues>) => void;
  onDataFiscalChange: (value: DataFiscalValue) => void;
}

const EMPTY_DATA_FISCAL: DataFiscalValue = { dataFiscalUrl: '', dataFiscalImageUrl: '' };

const LegalFooterFields = ({ values, dataFiscal, onChange, onDataFiscalChange }: LegalFooterFieldsProps) => {
  const [pastedCode, setPastedCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const errors = getLegalFooterErrors(values);

  const handleCodeChange = (raw: string) => {
    setPastedCode(raw);
    if (!raw.trim()) {
      setCodeError(null);
      return;
    }
    const result = parseDataFiscalCode(raw);
    if (!result.ok) {
      setCodeError(result.error);
      return;
    }
    setCodeError(null);
    onDataFiscalChange({ dataFiscalUrl: result.value.url, dataFiscalImageUrl: result.value.imageUrl });
  };

  const handleRemove = () => {
    setPastedCode('');
    setCodeError(null);
    onDataFiscalChange(EMPTY_DATA_FISCAL);
  };

  return (
    <>
      <h3 className="footer-editor-section-title">Datos del vendedor</h3>
      <p className="footer-editor-section-hint">
        Se muestran en el pie de la tienda. Los campos vacíos no aparecen.
      </p>
      <div className="footer-editor-grid">
        <div className="form-group">
          <TextField
            label="Razón social o nombre del titular"
            value={values.legalName}
            onChange={(e) => onChange({ legalName: e.target.value })}
            error={Boolean(errors.legalName)}
            helperText={errors.legalName}
            slotProps={{ htmlInput: { maxLength: LEGAL_FIELD_MAX.legalName + 1 } }}
            fullWidth
            size="small"
          />
        </div>
        <div className="form-group">
          <TextField
            label="CUIT"
            value={values.cuit}
            onChange={(e) => onChange({ cuit: e.target.value })}
            error={Boolean(errors.cuit)}
            helperText={errors.cuit ?? 'Formato: 20-12345678-6'}
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 13 } }}
            fullWidth
            size="small"
          />
        </div>
        <div className="form-group">
          <TextField
            label="Domicilio fiscal o comercial"
            value={values.fiscalAddress}
            onChange={(e) => onChange({ fiscalAddress: e.target.value })}
            error={Boolean(errors.fiscalAddress)}
            helperText={errors.fiscalAddress}
            fullWidth
            size="small"
          />
        </div>
        <div className="form-group">
          <TextField
            label="Horario de atención"
            value={values.businessHours}
            onChange={(e) => onChange({ businessHours: e.target.value })}
            error={Boolean(errors.businessHours)}
            helperText={errors.businessHours ?? 'Ej: Lunes a viernes de 9 a 18 h'}
            fullWidth
            size="small"
          />
        </div>
        <div className="form-group">
          <TextField
            label="Área responsable de atención al consumidor"
            value={values.responsibleArea}
            onChange={(e) => onChange({ responsibleArea: e.target.value })}
            error={Boolean(errors.responsibleArea)}
            helperText={errors.responsibleArea}
            fullWidth
            size="small"
          />
        </div>
      </div>

      <h3 className="footer-editor-section-title">Data Fiscal (ARCA)</h3>
      <p className="footer-editor-section-hint">
        Entrá a ARCA con tu clave fiscal, abrí el servicio &quot;Formulario 960/D&quot;, informá la
        dirección de la tienda y pegá acá el código que te muestra. Solo guardamos el enlace oficial.
      </p>
      <div className="form-group">
        <TextField
          label="Código de Data Fiscal"
          value={pastedCode}
          onChange={(e) => handleCodeChange(e.target.value)}
          error={Boolean(codeError)}
          helperText={codeError ?? undefined}
          multiline
          rows={3}
          fullWidth
          size="small"
        />
      </div>
      {dataFiscal.dataFiscalUrl && !codeError && (
        <p className="footer-editor-section-hint" role="status">
          Data Fiscal cargado: {new URL(dataFiscal.dataFiscalUrl).hostname}.{' '}
          <button type="button" className="admin-btn-secondary" onClick={handleRemove}>
            Quitar
          </button>
        </p>
      )}
    </>
  );
};

export default LegalFooterFields;
