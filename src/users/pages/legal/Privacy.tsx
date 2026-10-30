import DataProtectionNotice from '../../../components/common/DataProtectionNotice/DataProtectionNotice';
import { usePrivacyContent } from '../../../hooks/useLegalContent';
import LegalMarkup from './LegalMarkup';
import LegalPage from './LegalPage';

const Privacy = () => {
  const { content, loading } = usePrivacyContent();

  return (
    <LegalPage
      title="Política de privacidad"
      description="Qué datos personales recolectamos, para qué los usamos, con quién los compartimos y cómo ejercer tus derechos."
      path="/privacidad"
      version={null}
      loading={loading}
    >
      <LegalMarkup source={content.body} />
      {/* Leyenda obligatoria (Ley 25.326): fija, no depende de lo que publique el admin. */}
      <DataProtectionNotice />
    </LegalPage>
  );
};

export default Privacy;
