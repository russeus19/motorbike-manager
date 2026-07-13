import { Box, Flag } from "lucide-react";
import { RiderPhoto } from "../components/RiderPhoto.jsx";
import { TeamLogo } from "../components/TeamLogo.jsx";
import { OverallBadge, Panel } from "../components/UIPrimitives.jsx";
import { CATEGORY_DATA, PLAYABLE_CATEGORY_ORDER } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { computeTechCapacity } from "../utils/bikeDevelopment.js";
import { overallRating } from "../utils/riders.js";

export function SetupScreen({ managerName, setManagerName, category, pickCategory, teams, chooseTeam, goHome }) {
  const canPick = managerName.trim().length > 0;
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <button onClick={goHome} className="text-xs mb-4" style={{ color: COLORS.muted }}>← Volver al menú</button>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Flag size={20} style={{ color: COLORS.gold }} />
          <span className="text-xs tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>Motorbike Manager · Temporada 2026</span>
        </div>
        <h1 className="text-4xl font-bold" style={{ fontFamily: "Rajdhani, sans-serif" }}>Box, Box — Dirige un equipo real</h1>
        <p className="text-sm mt-2" style={{ color: COLORS.muted }}>Elegí categoría y escudería oficial de 2026, con pilotos reales valorados según su trayectoria y su nivel actual. Desarrollá la moto en cinco áreas, competí las 22 carreras del calendario real y ascendé talento de la categoría inferior en el mercado de fin de temporada.</p>
      </div>

      <div className="space-y-5 mb-6 max-w-xl">
        <div>
          <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: COLORS.muted }}>Tu nombre de mánager</label>
          <input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Ej: Sara Bianchi"
            className="w-full rounded-md px-3 py-2 outline-none border" style={{ background: COLORS.panel, borderColor: COLORS.rule, color: COLORS.text }} />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: COLORS.muted }}>Categoría</label>
        <div className="flex gap-2">
          {PLAYABLE_CATEGORY_ORDER.map((ck) => (
            <button key={ck} onClick={() => pickCategory(ck)}
              className="px-4 py-2 rounded-md text-sm font-semibold"
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
        <div className="grid sm:grid-cols-2 gap-3">
          {teams.map((t, idx) => (
            <button key={t.name} disabled={!canPick} onClick={() => chooseTeam(idx)}
              className="text-left rounded-lg border p-4 transition disabled:opacity-40"
              style={{ background: COLORS.panel, borderColor: COLORS.rule }}>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 min-w-0">
                  <TeamLogo team={t} size={32} className="rounded" />
                  <span className="font-bold truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: t.color }}>{t.name}</span>
                </span>
                <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0" style={{ background: COLORS.panel2, color: COLORS.muted }}>{t.tier} · {computeTechCapacity(t, t.budget)} pts I+D</span>
              </div>
              <div className="space-y-1">
                {t.riders.map((r) => (
                  <div key={r.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <RiderPhoto rider={r} size={26} shape="circle" />
                      {r.name} <span className="text-xs" style={{ color: COLORS.muted }}>({r.age} años)</span>
                    </span>
                    <OverallBadge value={overallRating(r)} accent={t.color} />
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Development Panel (collapsible: collapsed shows only the bike average)  */
/* ---------------------------------------------------------------------- */

