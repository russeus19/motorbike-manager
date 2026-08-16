import { X, Trophy, AlertTriangle, ChevronRight } from "lucide-react";
import { teamDisplayName } from "../utils/teamNaming.js";
import { StatBar, OverallBadge } from "./UIPrimitives.jsx";
import { CountryFlag } from "./CountryFlag.jsx";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { ManufacturerLogo } from "./ManufacturerLogo.jsx";
import { BikePhoto } from "./BikePhoto.jsx";
import { SponsorLogo } from "./SponsorLogo.jsx";
import { BIKE_AREA_KEYS, BIKE_LABELS } from "../data/bikeAreas.js";
import { CATEGORY_DATA } from "../data/categories.js";
import { PRESTIGE_SCALE_MAX } from "../data/categoryPrestigeConfig.js";
import { COLORS } from "../data/colors.js";
import { bikeModelFor } from "../data/bikeModels.js";
import { bikeForSeat, bikeTierForSeat, teamHasSplitBikeTiers, MOTOGP_BIKE_TIER_LABELS } from "../data/motogpBikeTiers.js";
import { bikeAvg } from "../utils/bikeDevelopment.js";
import { overallRating } from "../utils/riders.js";

/** A compact rider row, purpose-built for this modal's own tight
 * space — MyRidersPanel's own RiderRow (88px photo, stat-card grid)
 * is designed to fill a full-width panel on Inicio/Pilotos, and
 * overflowed badly crammed two-at-a-time into a 512px-wide card.
 * Everything that matters still fits on one line: photo, name, CA
 * badge, tier/status, and this season's points. */
function CompactRiderRow({ rider, tier, points, categoryKey, accent, onOpen }) {
  return (
    <button onClick={onOpen} className="w-full flex items-center gap-3 text-left rounded-lg p-2.5 mb-1.5 last:mb-0"
      style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
      <RiderPhoto rider={rider} size={48} className="rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <CountryFlag nat={rider.nat} width={15} />
          <span className="text-sm font-bold truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{rider.name}</span>
          <OverallBadge value={overallRating(rider)} accent={accent} />
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: COLORS.muted }}>
          {rider.age} años · {tier ? MOTOGP_BIKE_TIER_LABELS[tier] : "Titular"} · Contrato {rider.contractYears ?? 0} año{(rider.contractYears ?? 0) === 1 ? "" : "s"}
        </div>
        {rider.injury?.gpRemaining > 0 && (
          <div className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: COLORS.danger }}>
            <AlertTriangle size={10} className="flex-shrink-0" /> Lesión {rider.injury.severityLabel} · {rider.injury.gpRemaining} GP
          </div>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold" style={{ fontFamily: "Rajdhani, sans-serif", color: accent }}>{points}</div>
        <div className="text-[9px] uppercase" style={{ color: COLORS.muted }}>pts</div>
      </div>
      <ChevronRight size={16} style={{ color: COLORS.muted }} className="flex-shrink-0" />
    </button>
  );
}

/** "La moto" — a compact, read-only echo of BikeHero's own layout for
 * whichever OTHER team this profile belongs to. */
function SingleBikeBlock({ team, categoryKey, accent, model, avg, bike }) {
  return (
    <div className="flex items-center gap-4">
      <BikePhoto team={team} categoryKey={categoryKey} accent={accent} size={100} sizeClassName="w-[100px] h-[100px] rounded-lg flex-shrink-0" objectFit="cover" objectPosition="center top" />
      <div className="flex-1 min-w-0">
        {model && <div className="text-base font-bold leading-tight mb-1.5 truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: accent }}>{model}</div>}
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={13} style={{ color: accent }} className="flex-shrink-0" />
          <div className="h-1.5 rounded-full flex-1" style={{ background: COLORS.rule }}>
            <div className="h-1.5 rounded-full" style={{ width: `${avg}%`, background: accent }} />
          </div>
          <span className="text-xs font-bold flex-shrink-0" style={{ color: accent, fontFamily: "Rajdhani, sans-serif" }}>{avg}/100</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {BIKE_AREA_KEYS.map((k) => (
            <div key={k} className="text-center rounded-md py-1" style={{ background: COLORS.panel }}>
              <div className="text-xs font-mono font-bold" style={{ color: COLORS.text }}>{Math.round(bike[k])}</div>
              <div className="text-[8px] uppercase truncate px-0.5" style={{ color: COLORS.muted }}>{BIKE_LABELS[k]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The split-tier equivalent (Gresini/VR46-style MotoGP satellites) —
 * one shared photo, two compact stat columns. */
function SplitBikeBlock({ team, categoryKey, accent, seasonNumber, manufacturerPreviousBikes, motogpSeatTiers }) {
  return (
    <div className="flex items-start gap-3">
      <BikePhoto team={team} categoryKey={categoryKey} accent={accent} size={72} sizeClassName="w-[72px] h-[72px] rounded-lg flex-shrink-0" objectFit="cover" objectPosition="center top" />
      <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
        {team.riders.map((r, i) => {
          const tier = bikeTierForSeat(team, i, categoryKey, motogpSeatTiers);
          const bike = bikeForSeat(team, i, categoryKey, manufacturerPreviousBikes, motogpSeatTiers);
          const avg = Math.round(bikeAvg(bike));
          return (
            <div key={r.id} className="min-w-0">
              <div className="text-xs font-bold truncate mb-0.5" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{r.name}</div>
              <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded mb-1.5" style={{ background: `${accent}24`, color: accent }}>{MOTOGP_BIKE_TIER_LABELS[tier]} · {avg}</span>
              <StatBar label="Media" value={avg} accent={accent} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Team profile — same shell/behavior as RiderProfileModal (fixed
 * header, scrollable body, click-outside/X to close). Kept
 * deliberately compact throughout: this is a 512px-wide card, not a
 * full screen, so every section below uses small, single-line rows
 * rather than the bigger full-panel components those same ideas use
 * elsewhere in the app (MyRidersPanel's RiderRow, BikeHero's own
 * layout) — reused in SPIRIT (same information, same visual language)
 * but not literally, since neither was built to survive being shown
 * two-at-a-time in this little space.
 */
export function TeamProfileModal({ target, onClose, onOpenRiderProfile, onOpenManufacturerProfile, playerTeam, motogpSeatTiers, manufacturerPreviousBikes, onTop = true }) {
  if (!target) return null;
  const { team, categoryKey, riderStandings, seasonNumber } = target;
  const accent = team.color || COLORS.gold;
  const teamName = teamDisplayName(team);
  const isSplit = teamHasSplitBikeTiers(team, categoryKey, motogpSeatTiers);
  // Bug fixed: a non-split MotoGP team used to always be treated as
  // "must be factory" for its model name and bike values — true for
  // most non-split teams (a works team, or a 4-bike manufacturer's
  // satellite), but NOT for a team whose two seats are uniformly
  // "previous" (both riders demoted together, same tier — not split,
  // since split specifically means the two seats DIFFER). Reading the
  // seat's own real tier (0 works fine here since a non-split team's
  // two seats share the same one by definition) fixes both the model
  // year label (GP27 instead of GP28) and the actual attribute values
  // (the real, 10%-penalized frozen snapshot instead of a stale
  // customerTop-era team.bike that was never updated when the team
  // got demoted).
  const uniformTier = bikeTierForSeat(team, 0, categoryKey, motogpSeatTiers) || "factory";
  const model = bikeModelFor(categoryKey, team.manufacturer, seasonNumber, uniformTier);
  const effectiveBike = bikeForSeat(team, 0, categoryKey, manufacturerPreviousBikes, motogpSeatTiers);
  const avg = Math.round(bikeAvg(effectiveBike));
  const sponsors = team.sponsors || {};
  const sponsorList = [
    sponsors.main ? { ...sponsors.main, roleLabel: "Principal" } : null,
    sponsors.secondary ? { ...sponsors.secondary, roleLabel: "Oficial" } : null,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", zIndex: onTop ? 70 : 60 }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border" style={{ background: COLORS.panel, borderColor: COLORS.rule, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold truncate mb-1" style={{ fontFamily: "Rajdhani, sans-serif" }}>{teamName}</h3>
            <div className="text-xs mb-2" style={{ color: COLORS.muted }}>{CATEGORY_DATA[categoryKey]?.label} · {team.tier}</div>
            <div className="flex items-center gap-3 text-xs" style={{ color: COLORS.muted }}>
              <span>Prestigio <b className="font-mono" style={{ color: accent }}>{Number.isFinite(team.prestige) ? team.prestige : "—"}</b></span>
              <span>·</span>
              <span className="font-mono" style={{ color: (team.budget || 0) < 0 ? COLORS.danger : COLORS.text }}>€{Math.round(team.budget || 0).toLocaleString()}</span>
            </div>
          </div>
          {team.manufacturer && (
            <button onClick={() => onOpenManufacturerProfile?.(team.manufacturer, categoryKey)} disabled={!onOpenManufacturerProfile}
              className="flex flex-col items-center gap-1 flex-shrink-0 ml-3 hover:opacity-80 disabled:pointer-events-none">
              <ManufacturerLogo name={team.manufacturer} accent={accent} size={56} />
              <span className="text-[10px] font-semibold" style={{ color: accent }}>{team.manufacturer}</span>
            </button>
          )}
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-full flex-shrink-0 transition-transform active:scale-90 ml-2" style={{ background: COLORS.panel2, color: COLORS.muted }}><X size={16} /></button>
        </div>

        <div className="p-4 pt-3" style={{ overflowY: "auto" }}>
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>Pilotos</div>
            {team.riders.map((r, i) => (
              <CompactRiderRow
                key={r.id}
                rider={r}
                tier={bikeTierForSeat(team, i, categoryKey, motogpSeatTiers)}
                points={riderStandings?.[r.id]?.points ?? 0}
                categoryKey={categoryKey}
                accent={accent}
                onOpen={() => onOpenRiderProfile(r, teamName, categoryKey)}
              />
            ))}
          </div>

          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>La moto</div>
            {isSplit ? (
              <SplitBikeBlock team={team} categoryKey={categoryKey} accent={accent} seasonNumber={seasonNumber} manufacturerPreviousBikes={manufacturerPreviousBikes} motogpSeatTiers={motogpSeatTiers} />
            ) : (
              <SingleBikeBlock team={team} categoryKey={categoryKey} accent={accent} model={model} avg={avg} bike={effectiveBike} />
            )}
          </div>

          {sponsorList.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>Patrocinadores</div>
              <div className="grid grid-cols-2 gap-2">
                {sponsorList.map((s, i) => (
                  <div key={i} className="rounded-lg p-1.5 flex items-center justify-center" style={{ border: `1px solid ${COLORS.rule}`, aspectRatio: "3 / 1" }}>
                    <SponsorLogo name={s.name} height={60} className="max-h-full" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
