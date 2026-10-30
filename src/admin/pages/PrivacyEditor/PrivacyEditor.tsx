import LegalContentEditor from '../../components/LegalContentEditor/LegalContentEditor';
import { getPrivacyContent, PRIVACY_CONTENT_KEY } from '../../../services/privacyService';

const PrivacyEditor = () => (
  <LegalContentEditor
    title="Política de privacidad"
    subtitle={<>Editá el texto que ven los clientes en <strong>/privacidad</strong>. La leyenda de la AAIP se agrega sola al final.</>}
    contentKey={PRIVACY_CONTENT_KEY}
    load={getPrivacyContent}
    versioned={false}
  />
);

export default PrivacyEditor;
