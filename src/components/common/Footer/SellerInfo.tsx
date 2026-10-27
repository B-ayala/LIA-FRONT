import type { FooterInfo } from '../../../admin/store/adminStore';

type SellerFields = Pick<FooterInfo, 'legalName' | 'cuit' | 'fiscalAddress' | 'businessHours' | 'responsibleArea'>;

const ROWS: ReadonlyArray<{ key: keyof SellerFields; label: string }> = [
  { key: 'legalName', label: 'Razón social' },
  { key: 'cuit', label: 'CUIT' },
  { key: 'fiscalAddress', label: 'Domicilio' },
  { key: 'businessHours', label: 'Horario de atención' },
  { key: 'responsibleArea', label: 'Atención al consumidor' },
];

/** Datos del proveedor. Solo se muestran las filas cargadas desde el panel; nada de texto de relleno. */
const SellerInfo = ({ info }: { info: SellerFields }) => (
  <div className="footer-column footer-seller">
    <h3 className="footer-title">Datos del vendedor</h3>
    <dl className="footer-seller-list">
      {ROWS.filter(({ key }) => Boolean(info[key]?.trim())).map(({ key, label }) => (
        <div className="footer-seller-row" key={key}>
          <dt>{label}</dt>
          <dd>{info[key]}</dd>
        </div>
      ))}
    </dl>
  </div>
);

export default SellerInfo;
