/**
 * Sportbike (WorldSPB) corre exactamente el mismo fin de semana que
 * Superbikes y Supersport: mismos 12 circuitos, mismo orden, ninguna
 * ronda propia distinta. Mismo patrón que supersportCalendar.js —
 * reexportamos directamente el de Superbikes en vez de duplicar el
 * mapeo, así que si el calendario de Superbikes cambiara de fecha
 * algún año, Sportbike lo sigue automáticamente sin tocar este archivo.
 */
export {
  SUPERBIKES_RACE_MAIN_ROUNDS as SPORTBIKE_RACE_MAIN_ROUNDS,
  SUPERBIKES_ROUND_MAP as SPORTBIKE_ROUND_MAP,
  isSuperbikesRaceWeek as isSportbikeRaceWeek,
} from "./superbikesCalendar.js";
