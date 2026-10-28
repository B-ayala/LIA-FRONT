import DataProtectionNotice from '../../../components/common/DataProtectionNotice/DataProtectionNotice';
import LegalPage from './LegalPage';

const Privacy = () => (
  <LegalPage
    title="Política de privacidad"
    description="Qué datos personales recolectamos, para qué los usamos, con quién los compartimos y cómo ejercer tus derechos."
    path="/privacidad"
  >
    <h2>Responsable</h2>
    <p>
      El responsable de la base de datos es el vendedor cuyos datos (razón social, CUIT y domicilio) figuran al pie de
      cada página.
    </p>

    <h2>Qué datos recolectamos</h2>
    <ul>
      <li>Al crear tu cuenta: nombre, e-mail, teléfono y contraseña.</li>
      <li>Al comprar: el detalle del pedido, la forma de entrega y de pago, y la versión de los términos que aceptaste
        (con la fecha, tu e-mail y tu dirección IP).</li>
      <li>Al pedir un arrepentimiento: nombre, e-mail, qué compraste y, si los completás, número de pedido, fecha e
        importe.</li>
      <li>Al contactarnos: los datos que escribas en el formulario.</li>
    </ul>
    <p>Los datos de tu tarjeta los trata Mercado Pago: nosotros no los recibimos.</p>

    <h2>Para qué los usamos</h2>
    <p>
      Para procesar tus compras, gestionar entregas, cambios, arrepentimientos y reclamos, responder tus consultas y
      cumplir obligaciones legales y fiscales. No vendemos tus datos ni los usamos para otras finalidades.
    </p>

    <h2>Con quién los compartimos</h2>
    <p>Solo en la medida necesaria, con los servicios que hacen funcionar la tienda:</p>
    <ul>
      <li>Mercado Pago, para los pagos.</li>
      <li>Proveedores de alojamiento y base de datos (Supabase, Render y Vercel) y de imágenes (Cloudinary).</li>
      <li>Proveedor de correo electrónico, para enviarte las constancias y avisos.</li>
      <li>Cloudflare, para verificar que quien se registra o ingresa no es un robot, y para medir el rendimiento del
        sitio de forma anónima.</li>
      <li>Google, que carga las tipografías y el mapa del pie de página. Al hacerlo recibe tu dirección IP y puede usar
        sus propias cookies.</li>
      <li>Autoridades, cuando la ley lo exija.</li>
    </ul>
    <p>
      Algunos de estos proveedores pueden almacenar o procesar datos fuera de la Argentina, con las garantías que
      prevé el artículo 12 de la Ley 25.326.
    </p>

    <h2>Cookies y almacenamiento en tu dispositivo</h2>
    <p>No usamos cookies publicitarias ni de seguimiento. Sí usamos mecanismos técnicos necesarios para que el sitio funcione:</p>
    <ul>
      <li>Una cookie técnica, que se crea al iniciar sesión, para mantener tu sesión abierta.</li>
      <li>Almacenamiento del navegador para tu carrito, las preferencias de visualización, datos en caché del
        encabezado y del carrusel, y el seguimiento de una compra en curso con Mercado Pago.</li>
    </ul>
    <p>Podés borrarlos desde la configuración de tu navegador; si lo hacés, se cierra tu sesión y se vacía el carrito.</p>

    <h2>Cuánto tiempo los guardamos</h2>
    <p>
      Mientras tengas tu cuenta o sea necesario para cumplir obligaciones legales (por ejemplo, la documentación de
      tus compras y la facturación).
    </p>

    <h2>Tus derechos</h2>
    <p>
      Podés pedir acceso a tus datos, que los corrijamos, actualicemos o eliminemos, escribiéndonos al e-mail de
      contacto que figura al pie del sitio. La supresión no procede cuando debamos conservar los datos por una
      obligación legal.
    </p>
    <DataProtectionNotice />

    <h2>Seguridad</h2>
    <p>Usamos conexión cifrada (HTTPS) y limitamos el acceso al panel de administración.</p>
  </LegalPage>
);

export default Privacy;
