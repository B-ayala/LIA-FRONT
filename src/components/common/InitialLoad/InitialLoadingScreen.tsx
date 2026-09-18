import LiaLoader from '../LiaLoader/LiaLoader';
import { detectSeasonFromDate, type SeasonId } from '../../../utils/seasonThemes';

// Mensaje según la estación real (fecha del visitante), no la que el admin
// haya elegido como tema visual — son dos cosas independientes.
const SEASON_LOADING_LABEL: Record<SeasonId, string> = {
  spring: 'Actualizando la moda ideal para primavera',
  summer: 'Actualizando la moda ideal para verano',
  autumn: 'Actualizando la moda ideal para otoño',
  winter: 'Actualizando la moda ideal para invierno',
  default: 'Actualizando la moda ideal para vos',
  mono: 'Actualizando la moda ideal para vos',
  rose: 'Actualizando la moda ideal para vos',
  emerald: 'Actualizando la moda ideal para vos',
  ocean: 'Actualizando la moda ideal para vos',
  burgundy: 'Actualizando la moda ideal para vos',
  custom: 'Actualizando la moda ideal para vos',
};

const InitialLoadingScreen = () => {
  const label = SEASON_LOADING_LABEL[detectSeasonFromDate()];
  return <LiaLoader variant="fullscreen" size="xl" label={label} />;
};

export default InitialLoadingScreen;
