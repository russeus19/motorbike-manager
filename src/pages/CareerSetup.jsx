import { useState } from "react";
import { ChevronRight, Rocket } from "lucide-react";
import { RiderPhoto } from "../components/RiderPhoto.jsx";
import { TeamLogo } from "../components/TeamLogo.jsx";
import { OverallBadge } from "../components/UIPrimitives.jsx";
import { CATEGORY_DATA } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { randomManagerNamePlaceholder } from "../data/managerNameExamples.js";
import { overallRating } from "../utils/riders.js";

export function CareerNameScreen({ managerName, setManagerName, onSubmit, goHome }) {
  const canContinue = managerName.trim().length > 0;
  const [namePlaceholder] = useState(randomManagerNamePlaceholder);
  return (
    <div className="max-w-lg mx-auto px-6 py-16">
      <button onClick={goHome} className="text-xs mb-4" style={{ color: COLORS.muted }}>← Volver al menú</button>
      <div className="flex items-center gap-2 mb-2">
        <Rocket size={20} style={{ color: COLORS.gold }} />
        <span className="text-xs tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>Modo Carrera</span>
      </div>
      <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "Rajdhani, sans-serif" }}>Empieza desde abajo, acaba en lo más alto</h2>
      <p className="text-sm mb-6" style={{ color: COLORS.muted }}>Vas a empezar con uno de los equipos más humildes de la categoría más baja. Gestiona bien tu escudería, desarrolla la moto, ficha a los mejores pilotos y te lloverán las ofertas.</p>

      <div className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: COLORS.muted }}>Tu nombre de mánager</label>
          <input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder={namePlaceholder}
            className="w-full rounded-md px-3 py-2 outline-none border" style={{ background: COLORS.panel, borderColor: COLORS.rule, color: COLORS.text }} />
        </div>
        <button disabled={!canContinue} onClick={onSubmit}
          className="w-full py-3 rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: COLORS.gold, color: "#12151A", fontFamily: "Rajdhani, sans-serif" }}>
          Ver equipos disponibles <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}


export function CareerPickerScreen({ choices, onChoose }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="flex items-center gap-2 mb-2">
        <Rocket size={20} style={{ color: COLORS.gold }} />
        <span className="text-xs tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>Modo Carrera · Moto3</span>
      </div>
      <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "Rajdhani, sans-serif" }}>Empieza desde abajo, acaba en lo más alto</h2>
      <p className="text-sm mb-6" style={{ color: COLORS.muted }}>Vas a empezar con uno de los equipos más humildes de la categoría más baja. Gestiona bien tu escudería, desarrolla la moto, ficha a los mejores pilotos y te lloverán las ofertas.</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {choices.map((t) => (
          <button key={t.id} onClick={() => onChoose(t)}
            className="text-left rounded-lg border p-4"
            style={{ background: COLORS.panel, borderColor: COLORS.rule }}>
            <div className="flex items-center gap-2 mb-2">
              <TeamLogo team={t} size={32} className="rounded" />
              <div className="font-bold" style={{ fontFamily: "Rajdhani, sans-serif", color: t.color }}>{t.name}</div>
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
  );
}


export function CareerOffersScreen({ offers, category, onAccept, onDecline }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="flex items-center gap-2 mb-2">
        <Rocket size={20} style={{ color: COLORS.gold }} />
        <span className="text-xs tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>Modo Carrera · Ofertas de fichaje</span>
      </div>
      <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "Rajdhani, sans-serif" }}>¿Cambiás de equipo?</h2>
      {offers.length === 0 && (
        <p className="text-sm mb-6" style={{ color: COLORS.muted }}>Nadie te ha ofrecido asiento esta temporada. Seguís con tu equipo actual.</p>
      )}
      {offers.length > 0 && (
        <p className="text-sm mb-6" style={{ color: COLORS.muted }}>Estos equipos quieren contar contigo como mánager. Si aceptás, heredás su plantilla actual — tus pilotos de ahora se quedan en tu antiguo equipo.</p>
      )}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {offers.map((o, i) => (
          <button key={i} onClick={() => onAccept(o)}
            className="text-left rounded-lg border p-4"
            style={{ background: COLORS.panel, borderColor: COLORS.rule }}>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 min-w-0">
                <TeamLogo team={o.team} size={32} className="rounded" />
                <span className="font-bold truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: o.team.color }}>{o.team.name}</span>
              </span>
              <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0" style={{ background: COLORS.panel2, color: COLORS.muted }}>
                {o.kind === "promotion" ? `Ascenso a ${CATEGORY_DATA[o.categoryKey]?.label}` : o.kind === "superbikes" ? "Salto a WorldSBK" : o.kind === "supersport" ? "Salto a WorldSSP" : CATEGORY_DATA[category].label}
              </span>
            </div>
            <div className="space-y-1">
              {o.team.riders.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <RiderPhoto rider={r} size={26} shape="circle" />
                    {r.name}
                  </span>
                  <OverallBadge value={overallRating(r)} accent={o.team.color} />
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
      <button onClick={onDecline}
        className="w-full py-3 rounded-md font-semibold"
        style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}`, fontFamily: "Rajdhani, sans-serif" }}>
        Quedarme en mi equipo actual
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Setup Screen                                                            */
/* ---------------------------------------------------------------------- */

