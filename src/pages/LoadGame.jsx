import { COLORS } from "../data/colors.js";
import { slotSummary } from "../utils/saveSlotFormat.js";

export function SlotPickScreen({ mode, slotsMeta, onPick, onLoad, goHome, storageOk }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <button onClick={goHome} className="text-xs mb-4" style={{ color: COLORS.muted }}>← Volver al menú</button>
      <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "Rajdhani, sans-serif" }}>{mode === "load" ? "Cargar partida" : "Elegí un slot para guardar"}</h2>
      <p className="text-sm mb-4" style={{ color: COLORS.muted }}>{mode === "load" ? "Seleccioná uno de tus 3 slots guardados." : "Tenés 3 slots disponibles. Elegir uno ocupado lo sobrescribirá."}</p>
      {!storageOk && (
        <div className="text-xs mb-4 rounded-md px-3 py-2" style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}`, color: COLORS.danger }}>
          El guardado persistente no está disponible ahora mismo, así que los slots pueden aparecer vacíos aunque hayas guardado antes.
        </div>
      )}
      <div className="space-y-3">
        {[1, 2, 3].map((n) => {
          const data = slotsMeta[n];
          const summary = slotSummary(data);
          return (
            <button key={n}
              disabled={mode === "load" && !summary}
              onClick={() => (mode === "load" ? onLoad(n, data) : onPick(n))}
              className="w-full text-left rounded-lg border p-4 disabled:opacity-40"
              style={{ background: COLORS.panel, borderColor: COLORS.rule }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold" style={{ fontFamily: "Rajdhani, sans-serif" }}>Slot {n}</span>
                {summary && <span className="text-xs" style={{ color: COLORS.muted }}>{summary.mode}</span>}
              </div>
              {summary ? (
                <div className="text-sm" style={{ color: COLORS.muted }}>
                  <div><strong style={{ color: COLORS.text }}>{summary.team}</strong> · {summary.manager}</div>
                  <div>{summary.category} · Temporada {summary.season} · {summary.gp}</div>
                  <div className="text-xs mt-1">Guardado: {summary.savedLabel}</div>
                </div>
              ) : (
                <div className="text-sm mt-1" style={{ color: COLORS.muted }}>Vacío</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

