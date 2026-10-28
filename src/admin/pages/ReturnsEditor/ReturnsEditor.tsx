import LegalContentEditor from '../../components/LegalContentEditor/LegalContentEditor';
import { getReturnsContent, RETURNS_CONTENT_KEY } from '../../../services/returnsService';

const ReturnsEditor = () => (
  <LegalContentEditor
    title="Cambios y devoluciones"
    subtitle={<>Editá el texto que ven los clientes en <strong>/cambios-y-devoluciones</strong>.</>}
    contentKey={RETURNS_CONTENT_KEY}
    load={getReturnsContent}
    versioned={false}
    backTo={{ to: '/admin/arrepentimientos', label: 'Volver a Arrepentimientos' }}
  />
);

export default ReturnsEditor;
