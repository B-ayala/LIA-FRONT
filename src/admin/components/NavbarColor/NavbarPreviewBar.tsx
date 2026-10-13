import './NavbarColor.css';

interface NavbarPreviewBarProps {
  color: string;
}

const LINKS = ['Inicio', 'Productos', 'Contacto', 'Quienes somos?'] as const;

// Maqueta del menú real (logo, links, íconos) pintada con el color elegido,
// para juzgar el contraste sobre el slide sin salir del admin. Debe ir dentro
// de un contenedor con `container-type: inline-size` (ver `.nc-preview`).
const NavbarPreviewBar = ({ color }: NavbarPreviewBarProps) => (
  <div className="nc-bar" style={{ color }} aria-hidden="true">
    <span className="nc-bar__logo">LIA</span>
    <span className="nc-bar__links">
      {LINKS.map((link) => <span key={link}>{link}</span>)}
    </span>
    <span className="nc-bar__icons">
      <span className="nc-bar__icon nc-bar__icon--search" />
      <span className="nc-bar__pill">Iniciar sesion</span>
      <span className="nc-bar__icon nc-bar__icon--cart" />
    </span>
  </div>
);

export default NavbarPreviewBar;
