import { useState } from "react";
import { Flag } from "lucide-react";
import { TeamPickCard, TEAM_PICK_CARD_KEYFRAMES } from "../components/TeamPickCard.jsx";
import { CATEGORY_DATA, CATEGORY_ORDER } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { randomManagerNamePlaceholder } from "../data/managerNameExamples.js";
import { computeTechCapacity } from "../utils/bikeDevelopment.js";

// "Independiente" es, con diferencia, el nivel más largo de los cuatro
// (Fábrica, Puntero, Satélite, Independiente) — en la franja estrecha de
// la tarjeta de equipo (junto a los puntos de I+D) empujaba el resto de
// la fila fuera de la pantalla en móvil. Solo se abrevia aquí; el resto
// del juego sigue usando el nombre completo del nivel.
const TIER_LABEL_COMPACT = { "Independiente": "Indep." };

export function SetupScreen({ managerName, setManagerName, category, pickCategory, teams, chooseTeam, goHome }) {
  const canPick = managerName.trim().length > 0;
  const [namePlaceholder] = useState(randomManagerNamePlaceholder);
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 overflow-x-hidden">
      <style>{TEAM_PICK_CARD_KEYFRAMES}</style>
      <button onClick={goHome} className="text-xs mb-4" style={{ color: COLORS.muted }}>← Volver al menú</button>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Flag size={20} style={{ color: COLORS.gold }} />
          <span className="text-xs tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>Motorbike Manager · Temporada 2026</span>
        </div>
        <h1 className="text-4xl font-bold" style={{ fontFamily: "Rajdhani, sans-serif" }}>Dirige al equipo real que prefieras</h1>
        <p className="text-sm mt-2" style={{ color: COLORS.muted }}>Elige la categoría y la escudería oficial de 2026. Desarrolla la moto, ficha o despide a tus pilotos, asciende al talento joven y compite en cada gran premio por ganar el campeonato.</p>
      </div>

      <div className="space-y-5 mb-6 max-w-xl">
        <div>
          <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: COLORS.muted }}>Tu nombre de mánager</label>
          <input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder={namePlaceholder}
            className="w-full rounded-md px-3 py-2 outline-none border" style={{ background: COLORS.panel, borderColor: COLORS.rule, color: COLORS.text }} />
        </div>
      </div>

      <div className="mb-6">
        <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: COLORS.muted }}>Categoría</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((ck) => (
            <button key={ck} onClick={() => pickCategory(ck)}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-transform active:scale-95"
              style={{
                background: category === ck ? COLORS.gold : COLORS.panel,
                color: category === ck ? "#12151A" : COLORS.text,
                border: `1px solid ${category === ck ? COLORS.gold : COLORS.rule}`,
                fontFamily: "Rajdhani, sans-serif",
              }}>
              {CATEGORY_DATA[ck].label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: COLORS.muted }}>Elegí tu escudería</label>
        {!canPick && <p className="text-sm mb-3" style={{ color: COLORS.danger }}>Escribí tu nombre de mánager para poder elegir equipo.</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t, idx) => (
            <TeamPickCard
              key={t.name}
              team={t}
              disabled={!canPick}
              onClick={() => chooseTeam(idx)}
              delay={idx * 45}
              badge={`${TIER_LABEL_COMPACT[t.tier] || t.tier} · ${computeTechCapacity(t, t.budget)} pts I+D`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Development Panel (collapsible: collapsed shows only the bike average)  */
/* ---------------------------------------------------------------------- */

