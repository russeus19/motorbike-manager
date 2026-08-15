/** Manufacturer-side dialogue lines, by zone (frío/dudoso/favorable) —
 * one shared bank rather than per-manufacturer personalities like
 * riders have; a factory speaking through its own sporting director
 * doesn't need five different voices the way individual riders do. */
export const MANUFACTURER_DIALOGUE = {
  favorable: [
    "Contamos con vosotros. Lo que pedís tiene sentido a la vista de cómo ha ido la temporada.",
    "El equipo técnico está de acuerdo — os lo ganáis con lo que estáis mostrando en pista.",
    "Aceptado. Es justo lo que esperamos de un buen socio dentro de la estructura.",
  ],
  dudoso: [
    "Lo entendemos, pero necesitamos ver algo más antes de comprometernos del todo.",
    "No es un no, pero tampoco podemos garantizar nada todavía — seguid dando resultados.",
    "Hay margen para hablarlo más adelante, si la tendencia se mantiene.",
  ],
  frio: [
    "Ahora mismo no podemos justificarlo internamente con estos números.",
    "Entendemos la frustración, pero la decisión no depende solo de la voluntad.",
    "No es el momento — hace falta mucho más antes de plantear algo así.",
  ],
};
