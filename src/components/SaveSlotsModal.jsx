import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { COLORS } from "../data/colors.js";
import { SAVE_SLOT_IDS, slotSummary } from "../utils/saveSlotFormat.js";

export function SaveSlotsModal({ slotsMeta, pendingOverwrite, saving, saveError, onPick, onConfirmOverwrite, onCancelOverwrite, onDeleteSlot, onClose }) {
  const [confirmDelete, setConfirmDelete] = useState(null); // slot number pending delete confirmation, or null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }}>
      <div className="w-full max-w-md rounded-lg border p-5" style={{ background: COLORS.panel, borderColor: COLORS.rule }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold" style={{ fontFamily: "Rajdhani, sans-serif" }}>Guardar partida</h3>
          <button onClick={onClose} className="p-1 rounded" style={{ background: COLORS.panel2, color: COLORS.muted }}><X size={16} /></button>
        </div>

        {pendingOverwrite ? (
          <div>
            <p className="text-sm mb-4" style={{ color: COLORS.muted }}>El slot {pendingOverwrite} ya tiene una partida guardada. ¿Seguro que querés sobrescribirla?</p>
            {saveError && (
              <div className="text-xs mb-3 rounded-md px-3 py-2" style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}`, color: COLORS.danger }}>
                {saveError}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button onClick={onConfirmOverwrite} disabled={saving} className="py-2 rounded-md font-semibold disabled:opacity-60" style={{ background: COLORS.gold, color: "#12151A" }}>
                {saving ? "Guardando…" : "Sí, sobrescribir"}
              </button>
              <button onClick={onCancelOverwrite} className="py-2 rounded-md text-sm" style={{ color: COLORS.muted }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm mb-4" style={{ color: COLORS.muted }}>Elegí en qué slot querés guardar.</p>
            {saveError && (
              <div className="text-xs mb-3 rounded-md px-3 py-2" style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}`, color: COLORS.danger }}>
                {saveError}
              </div>
            )}
            <div className="space-y-3">
              {SAVE_SLOT_IDS.map((n) => {
                const data = slotsMeta[n];
                const summary = slotSummary(data);
                if (confirmDelete === n) {
                  return (
                    <div key={n} className="w-full rounded-lg border p-3" style={{ background: COLORS.panel2, borderColor: COLORS.danger }}>
                      <div className="font-bold text-sm mb-1.5" style={{ fontFamily: "Rajdhani, sans-serif" }}>Slot {n}</div>
                      <p className="text-xs mb-2" style={{ color: COLORS.text }}>¿Seguro que quieres eliminar esta partida? Esta acción no se puede deshacer.</p>
                      <div className="flex gap-2">
                        <button onClick={() => { onDeleteSlot(n); setConfirmDelete(null); }} className="flex-1 py-1.5 rounded font-semibold text-xs" style={{ background: COLORS.danger, color: "#fff" }}>
                          Sí, eliminar
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="flex-1 py-1.5 rounded text-xs" style={{ background: COLORS.panel, color: COLORS.muted }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <button key={n} disabled={saving} onClick={() => onPick(n)}
                    className="w-full text-left rounded-lg border p-3 disabled:opacity-50"
                    style={{ background: COLORS.panel2, borderColor: COLORS.rule }}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="font-bold text-sm" style={{ fontFamily: "Rajdhani, sans-serif" }}>Slot {n}</div>
                      {summary && onDeleteSlot && (
                        <span onClick={(e) => { e.stopPropagation(); setConfirmDelete(n); }} role="button" aria-label={`Eliminar slot ${n}`}
                          className="p-1 rounded hover:opacity-80" style={{ color: COLORS.muted }}>
                          <Trash2 size={13} />
                        </span>
                      )}
                    </div>
                    {summary ? (
                      <div className="text-xs" style={{ color: COLORS.muted }}>
                        <div>{summary.team} · {summary.manager}</div>
                        <div>{summary.category} · Temporada {summary.season} · {summary.gp}</div>
                        <div>Guardado: {summary.savedLabel}</div>
                      </div>
                    ) : (
                      <div className="text-xs" style={{ color: COLORS.muted }}>Vacío</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
