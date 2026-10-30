import { Helmet } from 'react-helmet-async';
import { useShippingInfo } from '../../../hooks/useShippingInfo';

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  ogImage?: string;
  ogType?: string;
}

const SITE_NAME = 'LIA by Damiana Bella';
const BASE_URL = 'https://damiana-bella.vercel.app';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.jpg`;

const SEO = ({
  title,
  description,
  path = '/',
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
}: SEOProps) => {
  const { shippingSummary } = useShippingInfo();
  const metaDescription = description
    ?? `Tienda online de moda femenina LIA by Damiana Bella. Descubrí ropa, accesorios y tendencias con ${shippingSummary}.`;
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Moda Femenina`;
  const canonicalUrl = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={ogType} />

      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEO;
