import './DataProtectionNotice.css';

/**
 * Leyenda de la Disp. DNPDP 10/2008 (Ley 25.326): va en los formularios que recolectan datos
 * personales. El órgano de control es hoy la AAIP, que reemplazó a la Dirección Nacional de
 * Protección de Datos Personales citada en el texto original.
 */
const DataProtectionNotice = () => (
  <p className="data-protection-notice">
    El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
    gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo
    establecido en el artículo 14, inciso 3 de la Ley N° 25.326. La Agencia de Acceso a la Información Pública, en su
    carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que
    interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de
    protección de datos personales.
  </p>
);

export default DataProtectionNotice;
