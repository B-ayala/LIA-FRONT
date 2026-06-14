import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../../store/cartStore';
import { useAuthStore } from '../../../store/authStore';
import { parseColorOption } from '../../../utils/constants';
import { getProductPricing } from '../../../utils/pricing';
import { buildVariantLine as fmtVariantLine, allUnitsShareVariants } from '../../../utils/formatters';
import { extractErrorMessage } from '../../../utils/errorMessage';
import { createOrder, createMpPreference, INVALID_PRODUCT_PRICE_MESSAGE } from '../../../services/orderService';
import AuthModal from '../../components/auth/AuthModal';
import SEO from '../../../components/common/SEO/SEO';
import { useInitialLoadTask } from '../../../components/common/InitialLoad/InitialLoadProvider';
import './Checkout.css';

type ShippingMethod = 'correo' | 'moto' | 'local';

const SHIPPING_COSTS: Record<ShippingMethod, number | null> = {
  correo: 4400,
  moto: null, // variable según distancia
  local: 0,
};

const SHIPPING_LABEL: Record<ShippingMethod, string> = {
  correo: 'Correo Argentino',
  moto: 'Envío por moto (CABA)',
  local: 'Retiro en local',
};


// Zonas sin cobertura de mensajería en moto
const RESTRICTED_CPS = new Set([
  '1160',                   // La Boca
  '1275', '1280', '1285',   // Barracas
  '1104',                   // Villa 31 / Barrio Padre Mugica (Retiro)
  '1276',                   // Villa 21-24 (Barracas)
  '1437',                   // Villa 1-11-14 (Bajo Flores)
]);
const RESTRICTED_BARRIOS = new Set([
  'La Boca',
  'Barracas',
  'Villa 31', 'Barrio Padre Mugica',
  'Villa 21-24',
  'Villa 1-11-14', 'Bajo Flores',
]);

// Mapa estático CABA: CP → barrios. GeoRef no indexa barrios de CABA por CP.
const CABA_BARRIOS_BY_CP: Record<string, string[]> = {
  // Microcentro / San Nicolás
  '1000': ['San Nicolás'], '1001': ['San Nicolás'], '1002': ['San Nicolás'],
  '1003': ['San Nicolás'], '1004': ['San Nicolás'], '1005': ['San Nicolás'],
  '1006': ['San Nicolás'], '1007': ['San Nicolás'], '1008': ['San Nicolás'],
  '1009': ['San Nicolás'],
  // Puerto Madero
  '1059': ['Puerto Madero'], '1107': ['Puerto Madero'], '1155': ['Puerto Madero'],
  // Monserrat / San Telmo / Retiro
  '1104': ['Villa 31 / Barrio Padre Mugica'],
  '1300': ['Retiro'], '1301': ['Retiro'], '1302': ['Retiro'],
  '1303': ['Retiro'], '1304': ['Retiro'], '1305': ['Retiro'],
  '1306': ['Monserrat'], '1307': ['San Telmo'], '1308': ['San Telmo'],
  // Recoleta
  '1200': ['Recoleta'], '1201': ['Recoleta'], '1202': ['Recoleta'],
  '1203': ['Recoleta'], '1204': ['Recoleta'],
  // Balvanera
  '1205': ['Balvanera'], '1206': ['Balvanera'],
  // Almagro
  '1207': ['Almagro'], '1208': ['Almagro'],
  '1420': ['Almagro'], '1421': ['Almagro'],
  // Caballito
  '1209': ['Caballito'], '1210': ['Caballito'],
  '1402': ['Caballito'], '1403': ['Caballito'],
  '1404': ['Caballito'], '1405': ['Caballito'], '1406': ['Caballito'],
  // Flores
  '1211': ['Flores'], '1212': ['Flores'],
  '1240': ['Flores'], '1241': ['Flores'],
  '1400': ['Flores'], '1401': ['Flores'],
  '1407': ['Flores'], '1408': ['Flores'], '1409': ['Flores'],
  '1456': ['Flores'], '1457': ['Flores'], '1458': ['Flores'],
  // Floresta / Liniers / Villa Luro / Mataderos
  '1242': ['Floresta'],
  '1232': ['Liniers'], '1410': ['Liniers'],
  '1412': ['Villa Luro'], '1436': ['Villa Luro'],
  '1413': ['Mataderos'],
  '1414': ['Parque Avellaneda', 'Mataderos'],
  '1437': ['Villa 1-11-14 (Bajo Flores)'],
  // Villa Lugano / Villa Soldati / Villa Riachuelo (zona sur)
  '1438': ['Villa Lugano', 'Villa Soldati'],
  '1439': ['Parque Avellaneda', 'Mataderos', 'Villa Riachuelo', 'Villa Soldati'],
  '1440': ['Villa Soldati', 'Villa Riachuelo'],
  '1441': ['Villa Soldati'],
  '1444': ['Villa Lugano'], '1445': ['Villa Lugano'],
  '1446': ['Villa Lugano'], '1447': ['Villa Lugano'], '1448': ['Villa Lugano'],
  // Boedo / San Cristóbal / Constitución
  '1285': ['Barracas'], '1286': ['Boedo'],
  '1287': ['San Cristóbal'], '1288': ['San Cristóbal'],
  '1290': ['Constitución'], '1291': ['Constitución'], '1292': ['Constitución'],
  // Parque Patricios / La Boca / Barracas / Villa 21-24 / Nueva Pompeya
  '1213': ['Parque Patricios'],
  '1160': ['La Boca'],
  '1214': ['La Boca'], '1335': ['La Boca'], '1337': ['La Boca'],
  '1215': ['Barracas'], '1216': ['Barracas'], '1221': ['Barracas'], '1222': ['Barracas'],
  '1275': ['Barracas'], '1276': ['Villa 21-24 (Barracas)'],
  '1449': ['Barracas'], '1450': ['Barracas'], '1451': ['Barracas'], '1452': ['Barracas'],
  '1223': ['Nueva Pompeya'], '1224': ['Nueva Pompeya'], '1225': ['Nueva Pompeya'],
  '1459': ['Parque Chacabuco'],
  // Villa Crespo / La Paternal / Palermo / Colegiales / Chacarita
  '1282': ['Villa Crespo'], '1283': ['Villa Crespo'],
  '1454': ['Villa Crespo'], '1455': ['Villa Crespo'],
  '1284': ['La Paternal'],
  '1274': ['Palermo'], '1280': ['Barracas'], '1281': ['Palermo'],
  '1422': ['Palermo'], '1423': ['Palermo'],
  '1425': ['Palermo', 'Recoleta'],
  '1453': ['Palermo', 'Villa Crespo'],
  '1260': ['Colegiales'], '1429': ['Colegiales'],
  '1424': ['Chacarita'],
  // Belgrano / Núñez / Villa Urquiza / Villa Ortúzar
  '1426': ['Belgrano'], '1427': ['Belgrano'],
  '1428': ['Belgrano', 'Núñez'],
  '1270': ['Villa Urquiza'], '1272': ['Villa Urquiza'],
  '1273': ['Villa Ortúzar'],
  '1430': ['Villa Urquiza'], '1431': ['Villa Urquiza'],
  // Saavedra / Coghlan / Parque Chas / Agronomía
  '1256': ['Parque Chas'], '1257': ['Coghlan'],
  '1258': ['Saavedra'], '1432': ['Saavedra'],
  '1255': ['Agronomía'],
  // Villa Pueyrredón / Devoto / Villa del Parque
  '1250': ['Villa Pueyrredón'], '1433': ['Villa Pueyrredón'],
  '1340': ['Villa Devoto'], '1341': ['Villa Devoto'], '1342': ['Villa Devoto'],
  '1344': ['Villa Devoto'], '1345': ['Villa Devoto'], '1434': ['Villa Devoto'],
  '1343': ['Villa del Parque'], '1346': ['Villa del Parque'],
  '1347': ['Villa del Parque'], '1348': ['Villa del Parque'],
  '1248': ['Villa del Parque'], '1254': ['Villa del Parque'],
  '1416': ['Villa del Parque'], '1417': ['Villa del Parque'], '1418': ['Villa del Parque'],
  // Villa Santa Rita / Villa Real / Versalles / Monte Castro / Vélez Sársfield
  '1249': ['Villa Santa Rita'], '1419': ['Villa Santa Rita'],
  '1243': ['Villa Real'], '1435': ['Villa Real'],
  '1244': ['Versalles'],
  '1245': ['Monte Castro'],
  '1246': ['Vélez Sársfield'], '1411': ['Vélez Sársfield'],
};

// Mapa estático GBA: CP → localidades. GeoRef no cubre todos los CPs del conurbano.
const GBA_CP_MAP: Record<string, string[]> = {
  // Zona Norte — Vicente López
  '1600': ['Villa Martelli'], '1601': ['Villa Martelli'],
  '1602': ['Florida'], '1603': ['Villa Ballester'],
  '1605': ['Munro'], '1606': ['La Lucila'],
  '1638': ['Vicente López'], '1639': ['Olivos'],
  // Zona Norte — San Isidro
  '1607': ['Villa Adelina'], '1609': ['Boulogne'],
  '1640': ['Martínez'], '1641': ['Acassuso'],
  '1642': ['San Isidro'], '1643': ['Beccar'],
  // Zona Norte — San Fernando / Tigre
  '1644': ['Victoria'], '1645': ['San Fernando'], '1646': ['San Fernando'],
  '1616': ['Belén de Escobar'], '1618': ['El Talar de Pacheco'],
  '1619': ['Tigre'], '1620': ['General Pacheco'],
  '1621': ['Benavídez'], '1622': ['Benavídez'], '1648': ['Tigre'],
  // Zona Norte — Escobar / Pilar
  '1625': ['Belén de Escobar'], '1626': ['Garín'],
  '1628': ['Del Viso'], '1629': ['Pilar'],
  '1630': ['Pilar'], '1631': ['Pilar'],
  // Zona Norte — Gral. San Martín
  '1604': ['San Andrés'], '1608': ['Santa Rita'],
  '1650': ['San Martín'], '1651': ['San Andrés'],
  '1652': ['Villa Maipú'], '1653': ['Villa Ballester'],
  '1654': ['José León Suárez'], '1655': ['José León Suárez'],
  // Zona Norte — Malvinas Argentinas / José C. Paz / San Miguel
  '1613': ['Los Polvorines'], '1614': ['Grand Bourg'],
  '1615': ['José C. Paz'], '1635': ['Tortuguitas'],
  // Zona Norte — Morón / Hurlingham / Ituzaingó
  '1659': ['William Morris'], '1663': ['Hurlingham'], '1664': ['William Morris'],
  '1665': ['Haedo'], '1666': ['Haedo'], '1667': ['Haedo'],
  '1668': ['El Palomar'], '1669': ['El Palomar'],
  '1670': ['Morón'], '1671': ['Castelar'], '1672': ['Castelar'], '1673': ['Castelar'],
  '1674': ['Ituzaingó'], '1675': ['Ituzaingó'],
  // Zona Norte — Tres de Febrero
  '1678': ['Caseros'],
  // Zona Oeste — Tres de Febrero / La Matanza
  '1702': ['Ciudadela'], '1703': ['Ciudadela'],
  '1704': ['Ramos Mejía'], '1706': ['Tapiales'], '1707': ['Tapiales'],
  '1750': ['San Justo'], '1752': ['San Justo'], '1754': ['San Justo'],
  '1756': ['La Tablada'], '1757': ['González Catán'],
  '1758': ['Ramos Mejía'], '1759': ['Aldo Bonzi'],
  // Zona Oeste — Morón / Castelar
  '1708': ['Morón'], '1712': ['Castelar'],
  // Zona Oeste — Merlo / Padua
  '1713': ['Merlo'], '1676': ['Padua'], '1677': ['Merlo'],
  '1718': ['San Antonio de Padua'],
  '1719': ['Merlo'], '1722': ['Merlo'], '1723': ['Merlo'], '1724': ['Merlo'],
  // Zona Oeste — Moreno
  '1728': ['Moreno'], '1730': ['Moreno'],
  '1744': ['Moreno'], '1745': ['Moreno'],
  '1746': ['Moreno'], '1748': ['Francisco Álvarez'],
  // Zona Sur — Avellaneda
  '1800': ['Avellaneda'], '1801': ['Avellaneda'],
  '1860': ['Avellaneda'], '1862': ['Piñeyro'],
  '1868': ['Gerli'], '1870': ['Avellaneda'], '1872': ['Wilde'],
  // Zona Sur — Lanús
  '1820': ['Lanús'], '1822': ['Lanús Este'],
  '1824': ['Lanús'], '1826': ['Lanús Oeste'],
  // Zona Sur — Lomas de Zamora
  '1832': ['Lomas de Zamora'], '1834': ['Lomas de Zamora'],
  '1836': ['La Noria'], '1838': ['Ingeniero Budge'],
  '1850': ['Temperley'], '1852': ['Turdera'],
  // Zona Sur — Almirante Brown / Esteban Echeverría / Ezeiza
  '1840': ['Monte Grande'], '1842': ['Monte Grande'], '1844': ['Monte Grande'],
  '1846': ['Adrogué'], '1848': ['Burzaco'],
  '1854': ['Longchamps'], '1856': ['Glew'], '1858': ['Canning'],
  // Zona Sur — Quilmes / Berazategui
  '1874': ['Quilmes'], '1876': ['Quilmes'],
  '1878': ['Quilmes'], '1880': ['Quilmes'],
  '1882': ['Bernal'], '1884': ['Bernal'], '1886': ['Ezpeleta'],
  '1892': ['Berazategui'], '1894': ['Berazategui'],
  // Zona Sur — Florencio Varela
  '1888': ['Florencio Varela'], '1890': ['Florencio Varela'],
  // Extras AMBA (logística extendida)
  '1924': ['Berisso'],
};

// CPs fuera del rango 1000–1893 que igual se cubren por logística AMBA
const EXTRA_AMBA_CPS = new Set(['2752', '2760', '2814', '2930', '2931', '2935', '2953']);

const GBA_AMBA_PARTIDOS = new Set([
  'Almirante Brown', 'Avellaneda', 'Berazategui', 'Esteban Echeverría',
  'Ezeiza', 'Florencio Varela', 'General San Martín', 'Hurlingham',
  'Ituzaingó', 'José C. Paz', 'La Matanza', 'Lanús', 'Lomas de Zamora',
  'Malvinas Argentinas', 'Merlo', 'Moreno', 'Morón', 'Quilmes',
  'San Fernando', 'San Isidro', 'San Miguel', 'Tigre',
  'Tres de Febrero', 'Vicente López',
]);

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const isAMBA = (provincia: string, municipio?: string): boolean => {
  const prov = normalize(provincia);
  if (prov.includes('autonoma') || prov.includes('caba')) return true;
  if (prov === 'buenos aires' && municipio) {
    return [...GBA_AMBA_PARTIDOS].some((p) => normalize(p) === normalize(municipio));
  }
  return false;
};


const Checkout = () => {
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mpError, setMpError] = useState('');
  const [mpReady, setMpReady] = useState(false);
  const currentUser = useAuthStore((s) => s.currentUser);
  const authInitialized = useAuthStore((s) => s.authInitialized);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('mp');
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod>('moto');
  const [motoAddress, setMotoAddress] = useState('');
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addrDireccion, setAddrDireccion] = useState('');
  const [addrNoNumber, setAddrNoNumber] = useState(false);
  const [addrDept, setAddrDept] = useState('');
  const [addrIndicaciones, setAddrIndicaciones] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrProvince, setAddrProvince] = useState('');
  const [addrPostalCode, setAddrPostalCode] = useState('');
  const [postalLoading, setPostalLoading] = useState(false);
  const [postalLocalities, setPostalLocalities] = useState<{ nombre: string; provincia: string }[]>([]);
  const [postalOutOfArea, setPostalOutOfArea] = useState(false);
  const [postalRestrictedZone, setPostalRestrictedZone] = useState(false);
  const [cityManual, setCityManual] = useState(false);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const cartItems = useCartStore((s) => s.items);
  const item = useCartStore((s) => s.item);
  const clearCart = useCartStore((s) => s.clearCart);
  const directCheckoutItem = item?.source === 'direct' ? item : null;
  const checkoutItems = directCheckoutItem
    ? [directCheckoutItem]
    : cartItems.map((cartItem) => {
        const unitPrice = getProductPricing(cartItem.product).finalPrice;

        return {
          product: cartItem.product,
          quantity: cartItem.quantity,
          unitVariants: cartItem.unitVariants,
          unitPrice,
          totalPrice: unitPrice * cartItem.quantity,
          source: 'cart' as const,
        };
      });

  useInitialLoadTask('route', loading);

  const confirmEnabled = (addrDireccion.trim() !== '' || addrNoNumber) && !!addrProvince && !!addrCity && !postalOutOfArea && !postalRestrictedZone;

  useEffect(() => {
    if (confirmEnabled && modalBodyRef.current) {
      modalBodyRef.current.scrollTo({ top: modalBodyRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [confirmEnabled]);

  useEffect(() => {
    if (postalRestrictedZone && modalBodyRef.current) {
      modalBodyRef.current.scrollTo({ top: modalBodyRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [postalRestrictedZone]);

  useEffect(() => {
    if (addrCity && RESTRICTED_BARRIOS.has(addrCity)) {
      setPostalRestrictedZone(true);
    }
  }, [addrCity]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentUser) {
      setBuyerName(currentUser.name);
      setBuyerEmail(currentUser.email);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!loading && checkoutItems.length === 0) {
      navigate('/products');
    }
  }, [checkoutItems.length, loading, navigate]);

  if (loading) {
    return (
      <div className="checkout-loading-screen">
        <div className="checkout-spinner"></div>
        <p className="checkout-loading-text">Preparando tu compra...</p>
      </div>
    );
  }

  if (!authInitialized) {
    return (
      <div className="checkout-loading-screen">
        <div className="checkout-spinner"></div>
        <p className="checkout-loading-text">Recuperando tu sesión...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="checkout-loading-screen">
        <p className="checkout-loading-text" style={{ marginBottom: '1rem' }}>
          Debés iniciar sesión para continuar con la compra.
        </p>
        <button
          onClick={() => setShowAuthModal(true)}
          style={{
            padding: '0.65rem 1.5rem',
            background: 'var(--primary-color, #6366f1)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Iniciar sesión
        </button>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  if (checkoutItems.length === 0) return null;

  const itemsSubtotal = checkoutItems.reduce(
    (sum, checkoutItem) => sum + (Number.isFinite(checkoutItem.totalPrice) ? checkoutItem.totalPrice : 0),
    0
  );
  const hasValidPrice =
    checkoutItems.length > 0 &&
    checkoutItems.every(
      (checkoutItem) =>
        Number.isFinite(checkoutItem.unitPrice) &&
        checkoutItem.unitPrice > 0 &&
        Number.isFinite(checkoutItem.totalPrice) &&
        checkoutItem.totalPrice > 0
    );
  const shippingCost = SHIPPING_COSTS[selectedShipping];
  const grandTotal = itemsSubtotal + (shippingCost ?? 0);
  const orderItemsPayload = checkoutItems.map((checkoutItem) => ({
    productId: String(checkoutItem.product.id),
    productName: checkoutItem.product.name,
    productImage: checkoutItem.product.image,
    quantity: checkoutItem.quantity,
    unitPrice: checkoutItem.unitPrice,
    totalPrice: checkoutItem.totalPrice,
    unitsConfig: checkoutItem.unitVariants,
  }));
  const canProceed =
    hasValidPrice &&
    buyerName.trim() !== '' &&
    buyerEmail.trim() !== '' &&
    (selectedShipping !== 'moto' || motoAddress.trim() !== '');

  const handlePostalCodeChange = async (value: string) => {
    setAddrPostalCode(value);
    setPostalOutOfArea(false);
    setPostalRestrictedZone(false);
    const digits = value.replace(/\D/g, '');

    if (digits.length < 4) {
      setPostalLocalities([]);
      return;
    }

    setPostalLoading(true);
    setPostalLocalities([]);
    setAddrProvince('');
    setAddrCity('');
    setCityManual(false);

    const cp = parseInt(digits, 10);

    // CABA (1000–1499): mapa estático, sin llamada a API
    if (cp >= 1000 && cp <= 1499) {
      const barrios = CABA_BARRIOS_BY_CP[digits];
      if (RESTRICTED_CPS.has(digits)) {
        setAddrProvince('Ciudad Autónoma de Buenos Aires');
        if (barrios && barrios.length > 0) setAddrCity(barrios[0]);
        setPostalRestrictedZone(true);
        setPostalLoading(false);
        return;
      }
      if (barrios) {
        const mapped = barrios.map(b => ({ nombre: b, provincia: 'Ciudad Autónoma de Buenos Aires' }));
        setPostalLocalities(mapped);
        setAddrProvince('Ciudad Autónoma de Buenos Aires');
        if (mapped.length === 1) setAddrCity(mapped[0].nombre);
      } else {
        // CP de CABA válido pero no mapeado
        setAddrProvince('Ciudad Autónoma de Buenos Aires');
        setAddrCity('CABA');
      }
      setPostalLoading(false);
      return;
    }

    // GBA: mapa estático primero, GeoRef como fallback para CPs no mapeados
    const gbaStatic = GBA_CP_MAP[digits];
    if (gbaStatic) {
      const mapped = gbaStatic.map(n => ({ nombre: n, provincia: 'Buenos Aires' }));
      setPostalLocalities(mapped);
      setAddrProvince('Buenos Aires');
      if (mapped.length === 1) setAddrCity(mapped[0].nombre);
      setPostalLoading(false);
      return;
    }

    try {
      type GeoItem = { nombre: string; provincia: { nombre: string }; municipio?: { nombre: string } };
      const queryGeoRef = async (endpoint: 'localidades' | 'asentamientos'): Promise<GeoItem[]> => {
        const res = await fetch(
          `https://apis.datos.gob.ar/georef/api/${endpoint}?codigo_postal=${encodeURIComponent(digits)}&campos=nombre,provincia.nombre,municipio.nombre&max=10`
        );
        const data = await res.json();
        return (data[endpoint] ?? []) as GeoItem[];
      };

      let items = await queryGeoRef('localidades');
      if (items.length === 0) items = await queryGeoRef('asentamientos');

      if (items.length === 0) {
        if (cp >= 1500 && cp <= 1893 || EXTRA_AMBA_CPS.has(digits)) {
          setAddrProvince('Buenos Aires');
          setAddrCity('Gran Buenos Aires');
        } else {
          setPostalOutOfArea(true);
        }
      } else {
        const { provincia, municipio } = items[0];
        if (!isAMBA(provincia.nombre, municipio?.nombre)) {
          setPostalOutOfArea(true);
        } else {
          const seen = new Set<string>();
          const mapped: { nombre: string; provincia: string }[] = [];
          for (const loc of items) {
            if (loc.nombre && !seen.has(loc.nombre)) {
              seen.add(loc.nombre);
              mapped.push({ nombre: loc.nombre, provincia: loc.provincia.nombre });
            }
          }
          if (mapped.length > 0) {
            setPostalLocalities(mapped);
            setAddrProvince(provincia.nombre);
            if (mapped.length === 1) setAddrCity(mapped[0].nombre);
            else setAddrCity('');
          }
        }
      }
    } catch {
      setPostalLocalities([]);
    } finally {
      setPostalLoading(false);
    }
  };

  const handleAddressClose = () => {
    setAddressModalOpen(false);
    setAddrDireccion('');
    setAddrNoNumber(false);
    setAddrDept('');
    setAddrIndicaciones('');
    setAddrCity('');
    setAddrProvince('');
    setAddrPostalCode('');
    setPostalLocalities([]);
    setPostalOutOfArea(false);
    setPostalRestrictedZone(false);
    setCityManual(false);
  };

  const handleAddressConfirm = () => {
    const display = [
      addrDireccion || 'Sin número',
      addrDept,
      addrCity,
      addrProvince,
      addrPostalCode ? `CP ${addrPostalCode}` : '',
      addrIndicaciones,
    ].filter(Boolean).join(', ');
    setMotoAddress(display);
    setAddressModalOpen(false);
  };

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  const buildVariantLineJoined = (uv: Record<string, string>): string =>
    Object.entries(uv)
      .map(([name, val]) => fmtVariantLine(name, val))
      .join(' | ');

  const buildWhatsAppMessage = (): string => {
    const lines: string[] = ['Hola, ¿cómo estás?', 'Quiero comprar los siguientes productos:', ''];

    checkoutItems.forEach((checkoutItem, index) => {
      const allSame = allUnitsShareVariants(checkoutItem.unitVariants);

      lines.push(`*Producto ${index + 1}:* ${checkoutItem.product.name}`);
      lines.push(`*Cantidad:* ${checkoutItem.quantity}`);
      lines.push('');

      if (allSame && Object.keys(checkoutItem.unitVariants[0] ?? {}).length > 0) {
        lines.push(`*Variantes:* ${buildVariantLineJoined(checkoutItem.unitVariants[0])}`);
      } else if (!allSame) {
        checkoutItem.unitVariants.forEach((uv, unitIndex) => {
          lines.push(`* Unidad ${unitIndex + 1}: ${buildVariantLineJoined(uv)}`);
        });
      }

      lines.push('');
      lines.push(`*Subtotal producto:* $${fmt(checkoutItem.totalPrice)}`);
      lines.push('');
    });

    const shippingLine =
      shippingCost === 0
        ? `* Envío: Gratis (Retiro en local)`
        : shippingCost === null
        ? `* Envío: Por moto - a coordinar por WhatsApp`
        : `* Envío: $${fmt(shippingCost)} (Correo Argentino)`;

    lines.push(
      `*Resumen:*`,
      '',
      `* Subtotal: $${fmt(itemsSubtotal)}`,
      shippingLine,
      `* Total: $${fmt(grandTotal)}`,
      '',
      `*Método de entrega:* ${SHIPPING_LABEL[selectedShipping]}`,
    );

    if (selectedShipping === 'moto' && motoAddress.trim()) {
      lines.push(`Domicilio de entrega: ${motoAddress.trim()}`);
    }

    lines.push('', 'Adjunto comprobante de pago.');

    return lines.join('\n');
  };

  const handlePaymentSubmit = async () => {
    setMpError('');

    if (!hasValidPrice) {
      setMpError(INVALID_PRODUCT_PRICE_MESSAGE);
      return;
    }

    if (selectedPayment === 'mp') {
      // Mostrar pantalla de aviso antes de redirigir a MP
      setMpReady(true);
      return;
    }

    if (selectedPayment === 'transfer') {
      try {
        await createOrder({
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          items: orderItemsPayload,
          paymentMethod: 'transfer',
          shippingMethod: selectedShipping,
          shippingCost,
          totalPrice: grandTotal,
        });
        const phoneNumber = '5491133631325';
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(buildWhatsAppMessage())}`;
        window.open(whatsappUrl, '_blank');
        clearCart();
      } catch (err) {
        setMpError(extractErrorMessage(err, 'No se pudo iniciar la compra. Intenta nuevamente.'));
      }
    }
  };

  const handleConfirmMpRedirect = async () => {
    if (!hasValidPrice) {
      setMpError(INVALID_PRODUCT_PRICE_MESSAGE);
      setMpReady(false);
      return;
    }

    setSubmitting(true);
    setMpReady(false);
    try {
      const { init_point, order_ids } = await createMpPreference({
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        items: orderItemsPayload,
        shippingMethod: selectedShipping,
        shippingCost,
        totalPrice: grandTotal,
      });
      sessionStorage.setItem('mp_last_order', JSON.stringify({
        items: checkoutItems.map((checkoutItem) => ({
          productName: checkoutItem.product.name,
          productImage: checkoutItem.product.image,
          quantity: checkoutItem.quantity,
          totalPrice: checkoutItem.totalPrice,
        })),
        itemsSubtotal,
        grandTotal,
        source: directCheckoutItem ? 'direct' : 'cart',
        shippingMethod: selectedShipping,
      }));
      sessionStorage.setItem('mp_order_ids', JSON.stringify(order_ids));
      window.location.href = init_point;
    } catch (err) {
      setMpError(extractErrorMessage(err, 'No se pudo conectar con el sistema de pagos. Intentá de nuevo o elegí transferencia.'));
      setSubmitting(false);
    }
  };

  return (
    <>
    <SEO
      title="Checkout"
      description="Completá tu compra en LIA. Revisá tu pedido, elegí la forma de entrega y pagá de forma segura."
      path="/checkout"
    />
    <div className="checkout-container">
      <h1 className="sr-only">Finalizar Compra</h1>
      <div className="checkout-content">
        {/* COLUMNA IZQUIERDA */}
        <div className="checkout-left-column">

          {/* Resumen del producto */}
          <section className="checkout-section">
            <h2 className="checkout-section-title">Tu pedido</h2>
            {checkoutItems.map((checkoutItem) => {
              const { product, quantity, unitVariants, unitPrice, totalPrice } = checkoutItem;
              const allSame = allUnitsShareVariants(unitVariants);

              return (
                <div key={String(product.id)} className="checkout-product-card">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="checkout-product-image"
                  />
                  <div className="checkout-product-info">
                    <p className="checkout-product-name">{product.name}</p>
                    <p className="checkout-product-qty">Cantidad: {quantity}</p>

                    {allSame && Object.keys(unitVariants[0] ?? {}).length > 0 && (
                      <div className="checkout-variants-summary">
                        {Object.entries(unitVariants[0]).map(([name, val]) => {
                          const isColor = name.toLowerCase() === 'color';
                          const { name: colorName, hex } = isColor
                            ? parseColorOption(val)
                            : { name: val, hex: '' };
                          return (
                            <span key={name} className="checkout-variant-tag">
                              {isColor && (
                                <span
                                  className="checkout-variant-color-dot"
                                  style={{ backgroundColor: hex }}
                                />
                              )}
                              <strong>{name}:</strong> {isColor ? colorName : val.toUpperCase()}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {!allSame && (
                      <div className="checkout-per-unit-variants">
                        {unitVariants.map((uv, i) => (
                          <div key={i} className="checkout-unit-row">
                            <span className="checkout-unit-label">Unidad {i + 1}:</span>
                            {Object.entries(uv).map(([name, val]) => {
                              const isColor = name.toLowerCase() === 'color';
                              const { name: colorName, hex } = isColor
                                ? parseColorOption(val)
                                : { name: val, hex: '' };
                              return (
                                <span key={name} className="checkout-variant-tag">
                                  {isColor && (
                                    <span
                                      className="checkout-variant-color-dot"
                                      style={{ backgroundColor: hex }}
                                    />
                                  )}
                                  <strong>{name}:</strong> {isColor ? colorName : val.toUpperCase()}
                                </span>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="checkout-product-pricing">
                      <span className="checkout-product-unit-price">{quantity} × ${fmt(unitPrice)}</span>
                      <span className="checkout-product-subtotal">${fmt(totalPrice)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Datos del comprador */}
          <section className="checkout-section">
            <h2 className="checkout-section-title">Tus datos</h2>
            <div className="checkout-buyer-fields">
              <div className="checkout-buyer-field">
                <label className="checkout-buyer-label" htmlFor="buyer-name">Nombre completo</label>
                <input
                  id="buyer-name"
                  type="text"
                  className="checkout-buyer-input"
                  placeholder="Ej: María González"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  readOnly={!!currentUser}
                  style={currentUser ? { background: '#f5f5f5', color: '#555', cursor: 'default' } : undefined}
                />
              </div>
              <div className="checkout-buyer-field">
                <label className="checkout-buyer-label" htmlFor="buyer-email">Email</label>
                <input
                  id="buyer-email"
                  type="email"
                  className="checkout-buyer-input"
                  placeholder="Ej: maria@ejemplo.com"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  readOnly={!!currentUser}
                  style={currentUser ? { background: '#f5f5f5', color: '#555', cursor: 'default' } : undefined}
                />
              </div>
            </div>
          </section>

          {/* Método de entrega */}
          <section className="checkout-section">
            <h2 className="checkout-section-title">Elegí la forma de entrega</h2>

            <div className="checkout-shipping-options">

              {/* Correo Argentino */}
              <div
                className="checkout-ship-card checkout-ship-card--disabled"
              >
                <div className="checkout-ship-main">
                  <div className="checkout-ship-left">
                    <input
                      type="radio"
                      name="shipping"
                      checked={false}
                      disabled
                      onChange={() => {}}
                    />
                    <div className="checkout-ship-info">
                      <p className="checkout-ship-title">Correo Argentino</p>
                      <p className="checkout-ship-sub">Despacho lun, mié y vie. Preparación: 24 hs.</p>
                      <p className="checkout-ship-sub">Llega en 3 a 5 días hábiles desde el despacho.</p>
                    </div>
                  </div>
                  <span className="checkout-ship-price">$4.400</span>
                </div>
                <div className="checkout-ship-footer">
                  <span className="checkout-ship-link">Te enviamos el número de seguimiento por WhatsApp una vez despachado</span>
                </div>
              </div>

              {/* Envío por moto */}
              <div
                className={`checkout-ship-card ${selectedShipping === 'moto' ? 'checkout-ship-card--selected' : ''}`}
                onClick={() => setSelectedShipping('moto')}
              >
                <div className="checkout-ship-main">
                  <div className="checkout-ship-left">
                    <input
                      type="radio"
                      name="shipping"
                      checked={selectedShipping === 'moto'}
                      onChange={() => setSelectedShipping('moto')}
                    />
                    <div className="checkout-ship-info">
                      <p className="checkout-ship-title">Envío por moto</p>
                      <p className="checkout-ship-sub">CABA y Gran Buenos Aires (AMBA).</p>
                      <p className="checkout-ship-sub">Base $4.000 + $800 por km desde el 2do km.</p>
                      {motoAddress && (
                        <p className="checkout-ship-sub checkout-ship-address">{motoAddress}</p>
                      )}
                    </div>
                  </div>
                  <span className="checkout-ship-price checkout-ship-price--variable">desde $4.000</span>
                </div>
                <div className="checkout-ship-footer">
                  <button
                    className="checkout-ship-link-btn"
                    onClick={(e) => { e.stopPropagation(); setAddressModalOpen(true); }}
                  >
                    {motoAddress ? 'Modificar domicilio' : 'Ingresá tu domicilio de entrega'}
                  </button>
                </div>
              </div>

              {/* Retiro en local */}
              <div
                className={`checkout-ship-card ${selectedShipping === 'local' ? 'checkout-ship-card--selected' : ''}`}
                onClick={() => setSelectedShipping('local')}
              >
                <div className="checkout-ship-main">
                  <div className="checkout-ship-left">
                    <input
                      type="radio"
                      name="shipping"
                      checked={selectedShipping === 'local'}
                      onChange={() => setSelectedShipping('local')}
                    />
                    <div className="checkout-ship-info">
                      <p className="checkout-ship-title">Retiro en local</p>
                      <p className="checkout-ship-sub">Podés retirar el mismo día de la compra.</p>
                      <p className="checkout-ship-sub">Horario: lunes a viernes 10 a 19 hs.</p>
                    </div>
                  </div>
                  <span className="checkout-ship-price checkout-ship-price--free">Gratis</span>
                </div>
                <div className="checkout-ship-footer">
                  <span className="checkout-ship-link">Coordinación por WhatsApp · Esperá confirmación antes de acercarte</span>
                </div>
              </div>

            </div>
          </section>

          {/* Forma de pago */}
          <section className="checkout-section">
            <h2 className="checkout-section-title">Elegí cómo pagar</h2>

            <div className="checkout-payment-methods">
              <label className={`checkout-payment-card ${selectedPayment === 'mp' ? 'checkout-payment-mp' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="mp"
                  checked={selectedPayment === 'mp'}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                <div className="checkout-payment-info">
                  <div className="checkout-payment-header">
                    <img src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.1/mercadopago/logo__small.png" alt="Mercado Pago" className="checkout-mp-logo" />
                    <strong>Pagar con Mercado Pago</strong>
                  </div>
                  <p className="checkout-payment-desc">
                    Pagá con tarjeta de crédito, débito, dinero en cuenta o cuotas.
                  </p>
                  <span className="checkout-recommended-badge">Recomendado</span>
                </div>
              </label>

              <label className="checkout-payment-card">
                <input
                  type="radio"
                  name="payment"
                  value="transfer"
                  checked={selectedPayment === 'transfer'}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                <div className="checkout-payment-info">
                  <div className="checkout-payment-header">
                    <strong>Transferencia por alias</strong>
                  </div>
                  <p className="checkout-payment-desc">
                    Realizá una transferencia bancaria por alias y coordiná el pago con el vendedor.
                  </p>
                  <div className="checkout-alias-box">
                    Alias: <strong>brianayala.mp</strong>
                  </div>
                  <p className="checkout-payment-small-text">
                    Una vez realizada la transferencia deberás enviar el comprobante.
                  </p>
                </div>
              </label>
            </div>
          </section>
        </div>

        {/* COLUMNA DERECHA — Resumen dinámico */}
        <div className="checkout-right-column">
          <div className="checkout-summary-card">
            <h3 className="checkout-summary-title">Resumen de compra</h3>

            <ul className="checkout-summary-list">
              {checkoutItems.map((checkoutItem) => (
                <li key={String(checkoutItem.product.id)}>
                  <span>
                    {checkoutItem.product.name}
                    {checkoutItem.quantity > 1 && <span className="checkout-summary-qty"> ×{checkoutItem.quantity}</span>}
                  </span>
                  <span>${fmt(checkoutItem.totalPrice)}</span>
                </li>
              ))}
              <li>
                <span>Envío</span>
                {shippingCost === 0 ? (
                  <span className="checkout-text-green">Gratis</span>
                ) : shippingCost === null ? (
                  <span className="checkout-text-muted">A coordinar</span>
                ) : (
                  <span>${fmt(shippingCost)}</span>
                )}
              </li>
            </ul>

            <div className="checkout-summary-divider"></div>

            <div className="checkout-summary-total">
              <span>Total</span>
              {shippingCost === null ? (
                <span>${fmt(itemsSubtotal)} + envío</span>
              ) : (
                <span>${fmt(grandTotal)}</span>
              )}
            </div>

            {mpError && (
              <p className="checkout-mp-error">{mpError}</p>
            )}
            {!hasValidPrice && !mpError && (
              <p className="checkout-mp-error">{INVALID_PRODUCT_PRICE_MESSAGE}</p>
            )}
            <button
              className="checkout-btn-primary"
              onClick={handlePaymentSubmit}
              disabled={!canProceed || submitting}
            >
              {submitting
                ? 'Redirigiendo a Mercado Pago...'
                : selectedPayment === 'transfer'
                  ? 'Enviar comprobante por WhatsApp'
                  : 'Continuar al pago'}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* AVISO 15 MINUTOS ANTES DE REDIRIGIR A MP */}
    {mpReady && (
      <div className="checkout-modal-overlay" onClick={() => setMpReady(false)}>
        <div className="checkout-modal checkout-mp-warning-modal" onClick={(e) => e.stopPropagation()}>
          <div className="checkout-mp-warning-icon">&#9203;</div>
          <h3 className="checkout-mp-warning-title">Estás a un paso de finalizar tu compra</h3>
          <p className="checkout-mp-warning-desc">
            Tenés <strong>15 minutos</strong> para completar el pago en Mercado Pago. Si no se acredita en ese tiempo, la orden se cancelará automáticamente y el producto volverá a estar disponible.
          </p>
          <div className="checkout-mp-warning-actions">
            <button
              className="checkout-btn-primary"
              onClick={handleConfirmMpRedirect}
            >
              Ir a Mercado Pago
            </button>
            <button
              className="checkout-btn-secondary"
              onClick={() => setMpReady(false)}
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    )}

    {/* MODAL DOMICILIO MOTO */}
    {addressModalOpen && (
      <div className="checkout-modal-overlay" onClick={handleAddressClose}>
        <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
          <div className="checkout-modal-header">
            <h3 className="checkout-modal-title">Ingresá tu domicilio</h3>
            <button className="checkout-modal-close" onClick={handleAddressClose}>✕</button>
          </div>

          <div className="checkout-modal-body" ref={modalBodyRef}>

            {/* Dirección */}
            <div className="checkout-modal-field">
              <label className="checkout-modal-label">Dirección o lugar de entrega</label>
              <input
                type="text"
                className="checkout-modal-input"
                placeholder="Ej: Avenida los leones 4563"
                value={addrDireccion}
                disabled={addrNoNumber}
                onChange={(e) => { setAddrDireccion(e.target.value); }}
              />
              <label className="checkout-modal-checkbox-label">
                <input
                  type="checkbox"
                  checked={addrNoNumber}
                  onChange={(e) => { setAddrNoNumber(e.target.checked); }}
                />
                Mi calle no tiene número
              </label>
            </div>

            {/* Código Postal */}
            <div className="checkout-modal-field">
              <label className="checkout-modal-label">Código Postal</label>
              <div className="checkout-modal-cp-row">
                <input
                  type="text"
                  className="checkout-modal-input"
                  placeholder="Ej: 1406"
                  maxLength={8}
                  value={addrPostalCode}
                  onChange={(e) => handlePostalCodeChange(e.target.value)}
                />
              </div>
              {postalLoading && <span className="checkout-modal-hint">Buscando localidades...</span>}
              {!postalLoading && postalOutOfArea && (
                <span className="checkout-modal-hint checkout-modal-hint--error">
                  No llegamos a esa zona.
                </span>
              )}
              {!postalLoading && postalRestrictedZone && (
                <span className="checkout-modal-hint checkout-modal-hint--error">
                  El envío en moto no está disponible para esta zona. Podés elegir Correo Argentino o retiro en local.
                </span>
              )}
            </div>

            {/* Provincia + Localidad */}
            <div className="checkout-modal-row">
              <div className="checkout-modal-field">
                <label className="checkout-modal-label">Zona</label>
                <input
                  type="text"
                  className="checkout-modal-input checkout-modal-input--readonly"
                  value={addrProvince ? 'AMBA' : ''}
                  placeholder="Se completa con el CP"
                  readOnly
                />
              </div>
              <div className="checkout-modal-field">
                <label className="checkout-modal-label">Localidad / Barrio</label>
                {cityManual ? (
                  <input
                    type="text"
                    className="checkout-modal-input"
                    placeholder="Ej: Villa Lugano"
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    autoFocus
                  />
                ) : postalLocalities.length > 1 ? (
                  <select
                    className="checkout-modal-input"
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                  >
                    <option value="">Seleccioná una localidad / barrio</option>
                    {postalLocalities.map((l) => (
                      <option key={l.nombre} value={l.nombre}>{l.nombre}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className={`checkout-modal-input checkout-modal-input--readonly ${addrCity ? 'checkout-modal-input--filled' : ''}`}
                    value={addrCity}
                    placeholder="Se completa con el CP"
                    readOnly
                  />
                )}
                <button
                  type="button"
                  className="checkout-modal-manual-btn"
                  onClick={() => {
                    if (cityManual) {
                      setCityManual(false);
                      if (postalLocalities.length === 1) setAddrCity(postalLocalities[0].nombre);
                      else setAddrCity('');
                    } else {
                      setCityManual(true);
                      setAddrCity('');
                    }
                  }}
                >
                  {cityManual ? '← Usar código postal' : 'Ingresar manualmente'}
                </button>
              </div>
            </div>

            {/* Departamento */}
            <div className="checkout-modal-field">
              <label className="checkout-modal-label">
                Departamento <span className="checkout-modal-optional">(opcional)</span>
              </label>
              <input
                type="text"
                className="checkout-modal-input"
                placeholder="Ej: 201"
                value={addrDept}
                onChange={(e) => setAddrDept(e.target.value)}
              />
            </div>

            {/* Indicaciones */}
            <div className="checkout-modal-field">
              <label className="checkout-modal-label">
                Indicaciones para la entrega <span className="checkout-modal-optional">(opcional)</span>
              </label>
              <textarea
                className="checkout-modal-input checkout-modal-textarea"
                placeholder="Ej.: Entre calles, color del edificio, no tiene timbre."
                value={addrIndicaciones}
                maxLength={128}
                onChange={(e) => setAddrIndicaciones(e.target.value)}
              />
              <span className="checkout-modal-char-count">{addrIndicaciones.length} / 128</span>
            </div>

            <div className="checkout-modal-info">
              <p>Cobertura: <strong>AMBA</strong> (CABA y Gran Buenos Aires).</p>
              <p>El costo se coordina por WhatsApp una vez confirmado el pedido.</p>
              <p className={`checkout-modal-info--warning${postalRestrictedZone ? ' checkout-modal-info--warning-active' : ''}`}>
                El servicio de mensajería en moto no se encuentra disponible para algunas zonas, como La Boca, Barracas y barrios vulnerables.
              </p>
            </div>
          </div>

          <div className="checkout-modal-footer">
            <button className="checkout-modal-btn-cancel" onClick={handleAddressClose}>
              Cancelar
            </button>
            <button
              className="checkout-modal-btn-confirm"
              onClick={handleAddressConfirm}
              disabled={!confirmEnabled}
            >
              Confirmar domicilio
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Checkout;
