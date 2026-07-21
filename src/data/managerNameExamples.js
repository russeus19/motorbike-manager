export const MANAGER_NAME_EXAMPLES = ["Valentino Rossi", "Ángel Nieto", "Giacomo Agostini", "Lucio Cecchinello", "Fausto Gresini", "Álex Crivillé", "Michael Doohan", "Wayne Rainey", "Kevin Schwantz"];

export function randomManagerNamePlaceholder() {
  return `Ej: ${MANAGER_NAME_EXAMPLES[Math.floor(Math.random() * MANAGER_NAME_EXAMPLES.length)]}`;
}
