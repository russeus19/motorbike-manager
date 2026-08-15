import { useState } from "react";
import { Bike, Check } from "lucide-react";
import { COLORS } from "../data/colors.js";
import { CountryFlag } from "./CountryFlag.jsx";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { MOTOGP_BIKE_TIER_LABELS } from "../data/motogpBikeTiers.js";

/**
 * Shown only to a player who controls a manufacturer's own factory
 * team, once per season transition, and only for a manufacturer that
 * genuinely has a "previous" tier in play (only Ducati today — see
 * data/motogpBikeTiers.js's own header comment on why a 4-bike
 * manufacturer never has this screen to show at all). Every OTHER
 * MotoGP satellite situation keeps resolving itself automatically via
 * reassignCustomerTopSeats — this screen is specifically for the one
 * case where the player themselves IS the manufacturer making the
 * call, which shouldn't happen silently just because it happens to
 * involve teams the player doesn't personally drive on track.
 *
 * candidates is the same scored, sorted array
 * candidateSeatsByManufacturer already produces — pre-selected here
 * exactly as reassignCustomerTopSeats' own automatic pass would have
 * picked (the top customerTopSlots entries), so a player who just
 * confirms without changing anything gets the identical outcome the
 * game would have applied on its own.
 *
 * onConfirm(selectedTeamSeatKeys: Set<string>) — keys are
 * `${teamName}::${seatIndex}`, matching how the seats are addressed
 * internally; the caller turns this into a full tiersMap.
 */
export function SeatSelectionScreen({ manufacturer, candidates, accent, onConfirm }) {
  const slots = candidates[0]?.customerTopSlots ?? 0;
  const seatKey = (c) => `${c.teamName}::${c.seatIndex}`;
  const [selected, setSelected] = useState(() => new Set(candidates.slice(0, slots).map(seatKey)));

  function toggle(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < slots) {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: "rgba(0,0,0,0.65)" }}>
      <div className="w-full max-w-lg rounded-2xl border flex flex-col" style={{ background: COLORS.bg, borderColor: COLORS.rule, maxHeight: "85vh", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }}>
        <div className="flex items-center gap-3 p-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${accent}1F`, border: `1px solid ${accent}` }}>
            <Bike size={20} style={{ color: accent }} />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold leading-tight" style={{ color: COLORS.text, fontFamily: "Rajdhani, sans-serif" }}>Reparto de motos cliente-top</div>
            <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{manufacturer} — elige {slots} piloto{slots === 1 ? "" : "s"} de {candidates.length} para la próxima temporada</div>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-2">
          <p className="text-xs mb-1" style={{ color: COLORS.muted }}>
            Ya vienen preseleccionados según rendimiento, expectativa cumplida y prestigio de esta temporada — puedes dejarlo así o cambiarlo tú mismo.
          </p>
          {candidates.map((c) => {
            const key = seatKey(c);
            const isSelected = selected.has(key);
            const r = c.rider;
            return (
              <button key={key} onClick={() => toggle(key)}
                className="w-full flex items-center gap-3 rounded-xl p-3 text-left"
                style={{ background: isSelected ? `${accent}14` : COLORS.panel, border: `1px solid ${isSelected ? accent : COLORS.rule}` }}>
                <RiderPhoto rider={r} size={48} className="rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {r?.nat && <CountryFlag nat={r.nat} width={14} />}
                    <span className="text-sm font-bold truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{r?.name || "—"}</span>
                  </div>
                  <div className="text-xs truncate" style={{ color: COLORS.muted }}>{c.teamName} · actualmente {MOTOGP_BIKE_TIER_LABELS[c.tier]}</div>
                </div>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isSelected ? accent : COLORS.panel2, border: `1px solid ${isSelected ? accent : COLORS.rule}` }}>
                  {isSelected && <Check size={14} style={{ color: "#12151A" }} />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 flex-shrink-0" style={{ borderTop: `1px solid ${COLORS.rule}` }}>
          <button disabled={selected.size !== slots} onClick={() => onConfirm(selected)}
            className="w-full py-3 rounded-lg font-bold disabled:opacity-40" style={{ background: accent, color: "#12151A" }}>
            {selected.size === slots ? "Confirmar reparto" : `Elige ${slots - selected.size} más`}
          </button>
        </div>
      </div>
    </div>
  );
}
