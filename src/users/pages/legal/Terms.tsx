import { useTermsContent } from '../../../hooks/useLegalContent';
import LegalMarkup from './LegalMarkup';
import LegalPage from './LegalPage';

const Terms = () => {
  const { content, loading } = useTermsContent();

  return (
    <LegalPage
      title="Términos y condiciones"
      description="Condiciones de uso del sitio y de compra en la tienda online."
      path="/terminos"
      version={content.version}
      loading={loading}
    >
      <LegalMarkup source={content.body} />
    </LegalPage>
  );
};

export default Terms;
