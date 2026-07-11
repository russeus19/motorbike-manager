import { useState } from "react";
import { Trash2 } from "lucide-react";
import { COLORS } from "../data/colors.js";
import { SAVE_SLOT_IDS, slotSummary } from "../utils/saveSlotFormat.js";

export function SlotPickScreen({ mode, slotsMeta, onPick, onLoad, onDeleteSlot, goHome, storageOk }) {
  const [confirmDelete, setConfirmDelete] = useState(null); // slot number pending confirmation, or null

  function handleDeleteClick(e, n) {
    e.stopPropagation();
    setConfirmDelete(n);
  }

  function handleConfirmDelete(e, n) {
    e.stopPropagation();
    onDeleteSlot(n);
    setConfirmDelete(null);
  }

  function handleCancelDelete(e) {
    e.stopPropagation();
    setConfirmDelete(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <button onClick={goHome} className="text-xs mb-4" style={{ color: COLORS.muted }}>← Volver al menú</button>
      <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "Rajdhani, sans-serif" }}>{mode === "load" ? "Cargar partida" : "Elegí un slot para guardar"}</h2>
      <p className="text-sm mb-4" style={{ color: COLORS.muted }}>{mode === "load" ? `Seleccioná uno de tus ${SAVE_SLOT_IDS.length} slots guardados.` : `Tenés ${SAVE_SLOT_IDS.length} slots disponibles. Elegir uno ocupado lo sobrescribirá.`}</p>
      {!storageOk && (
        <div className="text-xs mb-4 rounded-md px-3 py-2" style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}`, color: COLORS.danger }}>
          El guardado persistente no está disponible ahora mismo, así que los slots pueden aparecer vacíos aunque hayas guardado antes.
        </div>
      )}
      <div className="space-y-3">
        {SAVE_SLOT_IDS.map((n) => {
          const data = slotsMeta[n];
          const summary = slotSummary(data);
          if (confirmDelete === n) {
            return (
              <div key={n} className="w-full rounded-lg border p-4" style={{ background: COLORS.panel, borderColor: COLORS.danger }}>
                <div className="font-bold text-sm mb-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>Slot {n}</div>
                <p className="text-sm mb-3" style={{ color: COLORS.text }}>¿Seguro que quieres eliminar esta partida? Esta acción no se puede deshacer.</p>
                <div className="flex gap-2">
                  <button onClick={(e) => handleConfirmDelete(e, n)} className="flex-1 py-1.5 rounded font-semibold text-sm" style={{ background: COLORS.danger, color: "#fff" }}>
                    Sí, eliminar
                  </button>
                  <button onClick={handleCancelDelete} className="flex-1 py-1.5 rounded text-sm" style={{ background: COLORS.panel2, color: COLORS.muted }}>
                    Cancelar
                  </button>
                </div>
              </div>
            );
          }
          return (
            <button key={n}
              disabled={mode === "load" && !summary}
              onClick={() => (mode === "load" ? onLoad(n, data) : onPick(n))}
              className="w-full text-left rounded-lg border p-4 disabled:opacity-40 relative"
              style={{ background: COLORS.panel, borderColor: COLORS.rule }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold" style={{ fontFamily: "Rajdhani, sans-serif" }}>Slot {n}</span>
                <span className="flex items-center gap-2">
                  {summary && <span className="text-xs" style={{ color: COLORS.muted }}>{summary.mode}</span>}
                  {summary && onDeleteSlot && (
                    <span onClick={(e) => handleDeleteClick(e, n)} role="button" aria-label={`Eliminar slot ${n}`}
                      className="p-1 rounded hover:opacity-80" style={{ color: COLORS.muted }}>
                      <Trash2 size={14} />
                    </span>
                  )}
                </span>
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
