import { useReturnsContent } from '../../../hooks/useLegalContent';
import LegalMarkup from './LegalMarkup';
import LegalPage from './LegalPage';

const Returns = () => {
  const { content, loading } = useReturnsContent();

  return (
    <LegalPage
      title="Cambios y devoluciones"
      description="Cómo arrepentirte de una compra, cambiar una prenda o reclamar por un producto con falla."
      path="/cambios-y-devoluciones"
      version={null}
      loading={loading}
    >
      <LegalMarkup source={content.body} />
    </LegalPage>
  );
};

export default Returns;
