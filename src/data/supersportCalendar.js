/**
 * Supersport corre exactamente el mismo fin de semana que Superbikes:
 * mismos 12 circuitos, mismo orden, ninguna ronda propia distinta.
 * En vez de duplicar el mapeo, reexportamos directamente el de
 * Superbikes — si el calendario de Superbikes cambiara de fecha algún
 * año, Supersport lo sigue automáticamente sin tocar este archivo.
 */
export {
  SUPERBIKES_RACE_MAIN_ROUNDS as SUPERSPORT_RACE_MAIN_ROUNDS,
  SUPERBIKES_ROUND_MAP as SUPERSPORT_ROUND_MAP,
  isSuperbikesRaceWeek as isSupersportRaceWeek,
} from "./superbikesCalendar.js";
