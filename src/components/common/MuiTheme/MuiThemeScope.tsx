import type { PropsWithChildren } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../utils/theme';

// Alcance del theme de MUI. Antes vivía en App.tsx envolviendo toda la app, lo
// que obligaba a descargar y parsear MUI (~75 kB gzip) en el primer render de
// cualquier visita, incluida la de un anónimo que entra al Home y nunca abre un
// componente MUI. Ahora lo monta cada consumidor — todos detrás de lazy() —
// así MUI queda fuera del camino crítico sin que cambie cómo se ven.
//
// Anidarlo no tiene costo observable: si un consumidor MUI renderiza otro
// adentro, el de más afuera ya provee el mismo theme.
const MuiThemeScope = ({ children }: PropsWithChildren) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

export default MuiThemeScope;
