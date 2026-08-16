import { useState } from "react";
import { Bike, ArrowLeftRight, Flag } from "lucide-react";
import { COLORS } from "../data/colors.js";
import { CountryFlag } from "./CountryFlag.jsx";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { ManufacturerLogo } from "./ManufacturerLogo.jsx";
import { ManufacturerBikeRevealPhoto } from "./ManufacturerBikeRevealPhoto.jsx";
import { bikeModelFor } from "../data/bikeModels.js";
import { bikeForSeat, bikeTierForSeat, teamHasSplitBikeTiers, MOTOGP_BIKE_TIER_LABELS } from "../data/motogpBikeTiers.js";
import { bikeAvg } from "../utils/bikeDevelopment.js";
import { teamDisplayName } from "../utils/teamNaming.js";

/**
 * The season-opening "here's your new bike" welcome scene — shown
 * once, right as a new MotoGP season begins, to EVERY player
 * regardless of factory/satellite status (unlike SeatSelectionScreen,
 * which is a completely different decision — a factory controller
 * choosing which of ITS satellites' riders get the customerTop seats
 * across potentially several teams; this is every player just being
 * shown, and occasionally asked to confirm, what THEIR OWN two riders
 * are riding this year).
 *
 * Genuinely nothing to decide most of the time — both riders end up
 * on the same tier (a works team, a 4-bike manufacturer's satellite
 * with no split), so this is a pure recap: here's the bike, here's
 * who's riding it. The one real choice only appears when the team's
 * own two seats differ (a Gresini/VR46-style split) — swapping which
 * rider sits in which seat is a genuine call the player might want to
 * make themselves (their new signing on the better bike instead of
 * whoever the seat assignment happened to land on), not something
 * this screen should just silently decide for them.
 *
 * onConfirm(swapped: boolean) — swapped tells the caller whether to
 * reorder team.riders[0]/[1] (which is all a "swap" ever needs to do,
 * since bike tier is keyed by seat INDEX, not rider identity).
 */
/** The rider's own result from LAST season — pulled straight from
 * their history array (see utils/seasonHistory.js's own
 * recordSeasonHistory, which appends one entry per rider at every
 * season transition), so the player can weigh who actually earned the
 * better bike without having to remember it or go dig through a
 * profile screen first. Returns null for a rookie or a rider whose
 * most recent entry isn't literally last season (a cross-category
 * signing, a rider who sat out hurt, etc.) — shown as a neutral
 * "Novato" label rather than a stale or misleading number.
 */
function lastSeasonResultFor(rider, seasonNumber) {
  return (rider?.history || []).find((h) => h.season === seasonNumber - 1) || null;
}

export function SeasonBikeRevealScreen({ team, categoryKey, seasonNumber, motogpSeatTiers, manufacturerPreviousBikes, accent, onConfirm }) {
  const [swapped, setSwapped] = useState(false);
  const isSplit = teamHasSplitBikeTiers(team, categoryKey, motogpSeatTiers);
  // Bug fixed: this used to reorder WHO gets displayed first/second
  // (riders[0]/[1] swapping display position) while separately
  // inverting the seat lookup back to each rider's own ORIGINAL seat
  // — the two effects canceled out exactly, so a rider's position on
  // screen moved but the tier/bike actually shown for them never
  // changed at all, no matter how many times "Intercambiar" was
  // pressed. Riders now always stay in their normal display order;
  // only which SEAT's tier each one is shown riding actually flips.
  const seatIndexForRider = (riderIndex) => (swapped ? 1 - riderIndex : riderIndex);

  const factoryModel = bikeModelFor(categoryKey, team.manufacturer, seasonNumber, "factory");

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="w-full max-w-lg rounded-2xl border flex flex-col overflow-hidden" style={{ background: COLORS.bg, borderColor: COLORS.rule, maxHeight: "90vh", boxShadow: "0 20px 60px rgba(0,0,0,0.55)" }}>
        <div className="relative h-64 sm:h-80 flex-shrink-0" style={{ background: "#171723" }}>
          <ManufacturerBikeRevealPhoto manufacturer={team.manufacturer} accent={accent} className="w-full h-full" />
          <div className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.2em] font-semibold px-2 py-1 rounded" style={{ background: "rgba(0,0,0,0.5)", color: accent }}>
            Temporada {seasonNumber}
          </div>
        </div>

        <div className="px-5 pt-1 pb-4 flex-shrink-0" style={{ marginTop: -8 }}>
          <div className="flex items-center gap-2.5">
            <ManufacturerLogo name={team.manufacturer} accent={accent} size={32} />
            <div className="min-w-0">
              <div className="text-lg font-bold leading-tight" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{team.manufacturer}{factoryModel ? ` ${factoryModel.replace(team.manufacturer, "").trim()}` : ""}</div>
              <div className="text-xs" style={{ color: COLORS.muted }}>{teamDisplayName(team)}</div>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-5 pb-4 space-y-3">
          <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>
            {isSplit ? "Así arrancáis la temporada — ¿quién lleva cuál?" : "Así arrancáis la temporada"}
          </div>

          <div className={isSplit ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-2"}>
            {team.riders.map((r, riderIndex) => {
              const seatIndex = seatIndexForRider(riderIndex);
              const tier = bikeTierForSeat(team, seatIndex, categoryKey, motogpSeatTiers);
              const bike = bikeForSeat(team, seatIndex, categoryKey, manufacturerPreviousBikes, motogpSeatTiers);
              const model = bikeModelFor(categoryKey, team.manufacturer, seasonNumber, tier || "factory");
              const avg = Math.round(bikeAvg(bike));
              const lastSeason = lastSeasonResultFor(r, seasonNumber);
              return (
                <div key={r?.id ?? riderIndex} className="flex items-center gap-3 rounded-xl p-3" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                  <RiderPhoto rider={r} size={56} className="rounded-lg flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <CountryFlag nat={r?.nat} width={16} />
                      <span className="text-sm font-bold truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{r?.name || "—"}</span>
                    </div>
                    {tier && (
                      <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mb-1" style={{ background: `${accent}24`, color: accent }}>{MOTOGP_BIKE_TIER_LABELS[tier]}</span>
                    )}
                    <div className="text-xs" style={{ color: COLORS.muted }}>{model} · <span style={{ color: accent, fontWeight: 700 }}>{avg}/100</span></div>
                    <div className="text-[11px] mt-0.5" style={{ color: COLORS.muted }}>
                      {lastSeason
                        ? <>Año pasado: <span style={{ color: COLORS.text, fontWeight: 600 }}>{lastSeason.position}º</span> ({lastSeason.points} pts)</>
                        : "Novato — sin temporada anterior"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {isSplit && (
            <button onClick={() => setSwapped((v) => !v)}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold"
              style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
              <ArrowLeftRight size={15} style={{ color: accent }} />
              Intercambiar motos entre pilotos
            </button>
          )}
        </div>

        <div className="p-4 flex-shrink-0" style={{ borderTop: `1px solid ${COLORS.rule}` }}>
          <button onClick={() => onConfirm(swapped)}
            className="w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2" style={{ background: accent, color: "#12151A" }}>
            <Flag size={16} />
            Empezar la temporada
          </button>
        </div>
      </div>
    </div>
  );
}
