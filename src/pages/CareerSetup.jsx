import { useState } from "react";
import { ChevronRight, Rocket } from "lucide-react";
import { TeamPickCard, TEAM_PICK_CARD_KEYFRAMES } from "../components/TeamPickCard.jsx";
import { CATEGORY_DATA } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { randomManagerNamePlaceholder } from "../data/managerNameExamples.js";

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
          className="w-full py-3 rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-transform active:scale-[0.98]"
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
      <style>{TEAM_PICK_CARD_KEYFRAMES}</style>
      <div className="flex items-center gap-2 mb-2">
        <Rocket size={20} style={{ color: COLORS.gold }} />
        <span className="text-xs tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>Modo Carrera · Moto3</span>
      </div>
      <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "Rajdhani, sans-serif" }}>Empieza desde abajo, acaba en lo más alto</h2>
      <p className="text-sm mb-6" style={{ color: COLORS.muted }}>Vas a empezar con uno de los equipos más humildes de la categoría más baja. Gestiona bien tu escudería, desarrolla la moto, ficha a los mejores pilotos y te lloverán las ofertas.</p>
      <div className="grid sm:grid-cols-3 gap-4">
        {choices.map((t, idx) => (
          <TeamPickCard key={t.id} team={t} onClick={() => onChoose(t)} delay={idx * 60} />
        ))}
      </div>
    </div>
  );
}


export function CareerOffersScreen({ offers, category, onAccept, onDecline }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <style>{TEAM_PICK_CARD_KEYFRAMES}</style>
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
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {offers.map((o, i) => (
          <TeamPickCard
            key={i}
            team={o.team}
            onClick={() => onAccept(o)}
            delay={i * 60}
            badge={o.kind === "promotion" ? `Ascenso a ${CATEGORY_DATA[o.categoryKey]?.label}` : o.kind === "superbikes" ? "Salto a WorldSBK" : o.kind === "supersport" ? "Salto a WorldSSP" : CATEGORY_DATA[category].label}
          />
        ))}
      </div>
      <button onClick={onDecline}
        className="w-full py-3 rounded-md font-semibold transition-transform active:scale-[0.98]"
        style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}`, fontFamily: "Rajdhani, sans-serif" }}>
        Quedarme en mi equipo actual
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Setup Screen                                                            */
/* ---------------------------------------------------------------------- */

