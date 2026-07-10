import { CATEGORY_DATA } from "../data/categories.js";
import { CIRCUITS } from "../data/circuits.js";

export function slotSummary(data) {
  if (!data) return null;
  const gpIndex = data.round ?? 0;
  const gp = data.round >= CIRCUITS.length
    ? "Fin de temporada"
    : (CIRCUITS[gpIndex] || "").split("—")[0].trim();
  let savedLabel = "—";
  if (data.savedAt) {
    try {
      const d = new Date(data.savedAt);
      savedLabel = d.toLocaleString();
    } catch (e) { savedLabel = "—"; }
  }
  return {
    manager: data.managerName || "—",
    team: data.playerTeam?.name || "—",
    category: CATEGORY_DATA[data.category]?.label || data.category,
    mode: data.gameMode === "career" ? "Modo Carrera" : "Partida rápida",
    season: data.seasonNumber,
    gp,
    savedLabel,
  };
}
