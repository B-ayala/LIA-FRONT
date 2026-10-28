import LegalContentEditor from '../../components/LegalContentEditor/LegalContentEditor';
import { getTermsContent, TERMS_CONTENT_KEY } from '../../../services/termsService';

const TermsEditor = () => (
  <LegalContentEditor
    title="Términos y condiciones"
    subtitle={<>Editá el texto que ven los clientes en <strong>/terminos</strong>.</>}
    contentKey={TERMS_CONTENT_KEY}
    load={getTermsContent}
    versioned
  />
);

export default TermsEditor;
