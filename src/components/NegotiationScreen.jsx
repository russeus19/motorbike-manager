import { useMemo, useState } from "react";
import { ArrowRight, MessageCircle, X } from "lucide-react";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { COLORS } from "../data/colors.js";
import { computeJoinScore, riderPersonality } from "../utils/marketAI.js";
import { negotiationPatience, pickNegotiationLine, thermometerZone } from "../utils/negotiationDialogue.js";
import { computeMarketValue } from "../utils/riders.js";
import { teamDisplayName } from "../utils/teamNaming.js";
import { bikeAvg } from "../utils/bikeDevelopment.js";
import { teamHasSplitBikeTiers, bikeForSeat, MOTOGP_BIKE_TIER_LABELS, isRestrictedMotoGpSatellite } from "../data/motogpBikeTiers.js";

const ZONE_COLOR = { frio: COLORS.danger, dudoso: COLORS.gold, favorable: COLORS.success };
const ZONE_LABEL = { frio: "Frío", dudoso: "Dudoso", favorable: "Favorable" };

/**
 * The negotiation screen: a face-to-face pitch to a rider, instead of
 * a bare numbers form. Sized and framed exactly like every other
 * profile screen in the game (RiderProfileModal, TeamProfileModal) —
 * a centered card over a dimmed backdrop, not a full-screen takeover —
 * so it reads as one more screen in the same family, not a detour into
 * a different app. The thermometer updates live as the terms change —
 * before any offer is actually sent, purely a preview — and only locks
 * in a reaction once the player actually sends it.
 *
 * onSendOffer(teamOfferAmount, riderTerms) => "favorable" | "dudoso" | "frio"
 *   — called by the parent, which owns the actual game-state change;
 *   this component only owns the conversation's own local back-and-forth.
 * onClose(finalRiderId, endedInRejection) — called once the conversation
 *   is over, either by the player leaving or patience running out.
 */
export function NegotiationScreen({
  rider, categoryKey, playerTeam, currentTeamName, isUnemployed, contractYearsLeft, isRenewal,
  playerBikeAvg, currentTeamBikeAvg, releaseFee, scale, onSendOffer, onClose,
  motogpSeatTiers, manufacturerPreviousBikes, playerCategoryKey,
}) {
  const personality = riderPersonality(rider);
  const patience = negotiationPatience(rider);
  const fairSalary = rider.salary || Math.round(computeMarketValue(rider, scale || 1) * 0.15);
  // Bug fixed (feature request): the screen gave no hint at all of what
  // the rider is CURRENTLY earning — the one number that actually tells
  // the player what bracket to open a negotiation in. A free agent has
  // no current deal to show, so this only applies to a rider who's
  // actually under contract somewhere.
  const hasCurrentContract = !isUnemployed && contractYearsLeft > 0;

  const [salary, setSalary] = useState(Math.round(fairSalary * 1.05));
  const [years, setYears] = useState(2);
  const [winBonus, setWinBonus] = useState(0);
  const [titleBonus, setTitleBonus] = useState(0);
  const [teamOfferAmount, setTeamOfferAmount] = useState(Math.round(releaseFee || 0));

  // MotoGP-only: when the player's own team runs two different bike
  // tiers (a Gresini/VR46-style split — see data/motogpBikeTiers.js's
  // own header comment), a new signing isn't just "our bike" — it's
  // "whichever of our two seats you'd actually get". Being able to
  // promise the BETTER one is a real card to play in a tough
  // negotiation, not just flavor: it changes bikeAvgOffered below,
  // which computeJoinScore already weighs directly. Only ever shown
  // for a genuinely NEW signing (isRenewal means they're already
  // sitting in one of these two seats — nothing to offer there) and
  // only when the choice is real (a split team has exactly one
  // "previous" seat to contrast against "customerTop" with).
  // Bug fixed: both this and isMotoGpFactory below used to check
  // categoryKey — the RIDER's own ORIGIN category (see
  // AdvancedFreeAgentSearch's own freeAgentEntries, which tags a free
  // agent with r._fromCategoryKey, null for a legend who's never
  // actually raced in this save) — instead of playerCategoryKey, the
  // category the DESTINATION team (playerTeam, always where a signing
  // actually lands) really races in. Whether a split-tier offer or a
  // test-rider role even makes sense only ever depends on the
  // destination, never on wherever this particular rider happens to
  // have come from — a cross-category signing (promoting a Moto2
  // rider into a MotoGP team) or a legend free agent with no origin
  // category at all both used to silently fail this check and lose
  // access to either feature, with no visible explanation.
  const effectivePlayerCategoryKey = playerCategoryKey || categoryKey;
  const isSplitMotoGpTeam = effectivePlayerCategoryKey === "motogp" && !isRenewal && teamHasSplitBikeTiers(playerTeam, effectivePlayerCategoryKey, motogpSeatTiers);
  const previousSeatIndex = isSplitMotoGpTeam ? motogpSeatTiers[playerTeam.name]?.findIndex((t) => t === "previous") : -1;
  const previousTierBikeAvg = isSplitMotoGpTeam
    ? bikeAvg(bikeForSeat(playerTeam, previousSeatIndex, effectivePlayerCategoryKey, manufacturerPreviousBikes, motogpSeatTiers))
    : null;
  const [offeredBikeTier, setOfferedBikeTier] = useState("customerTop");
  const effectivePlayerBikeAvg = isSplitMotoGpTeam
    ? (offeredBikeTier === "previous" ? previousTierBikeAvg : bikeAvg(playerTeam.bike))
    : playerBikeAvg;

  // MotoGP-only: only a FACTORY team has a test rider slot to fill at
  // all — a satellite team's own riders are titulares, full stop, no
  // choice to make here. Only offered on a genuinely NEW signing
  // (isRenewal means they're already sitting in one of the team's real
  // seats, titular or probador — see App.jsx's own role-change
  // handling for changing an EXISTING rider's role instead), and only
  // when the team doesn't already have a probador on the books, since
  // there's only ever one test rider seat to fill.
  const isMotoGpFactory = effectivePlayerCategoryKey === "motogp" && !isRestrictedMotoGpSatellite(playerTeam, effectivePlayerCategoryKey, motogpSeatTiers);
  const canOfferTestRiderRole = isMotoGpFactory && !isRenewal && !playerTeam.testRider && playerTeam.riders.length >= 2;
  const [offeredRole, setOfferedRole] = useState("titular");

  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [usedLines, setUsedLines] = useState([]);
  const [reaction, setReaction] = useState(null); // { zone, line }
  const [ended, setEnded] = useState(false); // conversation over — no more sending

  // Bug fixed (feature): this screen is only ever reached directly
  // now when NO team-side release step was needed — a renewal, a free
  // agent, a rider with a year or less left, or someone whose current
  // team already cleared the release separately (TeamNegotiationScreen).
  // A ">0" check still showed this panel for the "1 year or less"
  // case, since 1 is still > 0 — that case is supposed to sign free,
  // no release fee at all, matching how needsTeamCompensation itself
  // only ever requires > 1 year everywhere else in the game.
  const needsTeamDeal = !isUnemployed && contractYearsLeft > 1 && currentTeamName;

  // Live preview only — recomputed on every render as the sliders move,
  // never itself the thing that decides an outcome. Sending is the only
  // action that actually commits to a reaction.
  // Bug fixed: the live preview omitted bikeAvgOffered/currentBikeAvg
  // entirely (defaulting to a neutral 60/60 inside computeJoinScore),
  // while sendNegotiationOffer in App.jsx always computed the REAL
  // bike averages on both sides. For a renewal the two sides are the
  // same team so this specific gap happened to cancel out — but for a
  // fresh signing or a poach, where the two bikes genuinely differ,
  // the thermometer the player watched moving live could land in a
  // different zone than what actually happened the moment they hit
  // send. Both now read from the same bikeAvg values the parent
  // screen already computed, so the preview and the real outcome can
  // never drift apart from each other.
  const liveScore = useMemo(() => computeJoinScore(rider, playerTeam, categoryKey, salary, {
    fromCategoryKey: rider._fromCategoryKey || categoryKey,
    bikeAvgOffered: effectivePlayerBikeAvg,
    currentBikeAvg: isUnemployed ? effectivePlayerBikeAvg : currentTeamBikeAvg,
    isUnemployed,
    seasonsUnsigned: rider.seasonsUnsigned || 0,
    isRenewal,
    years,
    offeredRole: canOfferTestRiderRole ? offeredRole : "titular",
  }), [rider, playerTeam, categoryKey, salary, isUnemployed, effectivePlayerBikeAvg, currentTeamBikeAvg, isRenewal, years, canOfferTestRiderRole, offeredRole]);
  const liveZone = thermometerZone(liveScore);
  const attemptsLeft = patience - attemptsUsed;

  function handleSend() {
    if (ended || attemptsLeft <= 0) return;
    const outcome = onSendOffer(teamOfferAmount, { salary, years, winBonus, titleBonus, bikeTier: isSplitMotoGpTeam ? offeredBikeTier : null, role: canOfferTestRiderRole ? offeredRole : "titular" });
    const line = pickNegotiationLine(personality, outcome, usedLines);
    setUsedLines((prev) => [...prev.slice(-3), line]);
    setReaction({ zone: outcome, line });
    const nextAttempts = attemptsUsed + 1;
    setAttemptsUsed(nextAttempts);

    if (outcome === "favorable") { setEnded(true); return; }
    if (outcome === "frio") { setEnded(true); return; }
    // "dudoso": stays open for another attempt if patience allows;
    // otherwise the conversation closes on its own with that offer
    // still standing, resolved at the next Grand Prix like any other
    // pending negotiation.
    if (nextAttempts >= patience) setEnded(true);
  }

  function handleClose() {
    const endedInRejection = ended && reaction?.zone === "frio";
    const patienceExhaustedCold = ended && reaction?.zone !== "favorable" && attemptsUsed >= patience && reaction?.zone !== "dudoso";
    onClose(rider.id, endedInRejection || patienceExhaustedCold);
  }

  const zoneColor = ZONE_COLOR[reaction?.zone || liveZone];
  const needlePct = Math.round(((reaction ? (reaction.zone === "favorable" ? 0.95 : reaction.zone === "frio" ? 0.05 : 0.5) : liveScore) - 0.03) / (0.95 - 0.03) * 100);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: "rgba(0,0,0,0.65)" }} onClick={handleClose}>
      <div className="w-full max-w-lg rounded-2xl border flex flex-col" style={{ background: COLORS.bg, borderColor: COLORS.rule, maxHeight: "85vh", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }} onClick={(e) => e.stopPropagation()}>
        {/* Cabecera — el piloto */}
        <div className="relative flex items-center gap-4 p-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
          <button onClick={handleClose} className="absolute right-4 top-5" aria-label="Cerrar conversación">
            <X size={20} style={{ color: COLORS.muted }} />
          </button>
          <RiderPhoto rider={rider} size={68} shape="circle" />
          <div className="min-w-0">
            <div className="text-xl font-bold leading-tight" style={{ color: COLORS.text, fontFamily: "Rajdhani, sans-serif" }}>{rider.name}</div>
            <div className="flex items-center gap-1.5 mt-1 text-sm" style={{ color: COLORS.muted }}>
              {isUnemployed ? "Agente libre" : currentTeamName}
              <ArrowRight size={13} />
              <span style={{ color: COLORS.gold }}>{teamDisplayName(playerTeam)}</span>
            </div>
            <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${COLORS.gold}22`, color: COLORS.gold, border: `1px solid ${COLORS.gold}` }}>
              {personality}
            </span>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {/* Termómetro y diálogo */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: COLORS.muted }}>
              <span>Frío</span>
              <span style={{ color: zoneColor, fontWeight: 700 }}>{ZONE_LABEL[reaction?.zone || liveZone]}</span>
              <span>Favorable</span>
            </div>
            <div className="h-3 rounded-full w-full relative overflow-hidden" style={{ background: COLORS.panel2 }}>
              <div className="absolute inset-y-0 left-0" style={{ width: "100%", background: `linear-gradient(90deg, ${COLORS.danger}, ${COLORS.gold}, ${COLORS.success})`, opacity: 0.3 }} />
              <div className="absolute top-1/2 h-4 w-1.5 rounded-full transition-all duration-300" style={{ left: `${clampPct(needlePct)}%`, transform: "translate(-50%,-50%)", background: zoneColor, boxShadow: `0 0 8px ${zoneColor}` }} />
            </div>
          </div>

          <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
            <MessageCircle size={17} style={{ color: zoneColor, flexShrink: 0, marginTop: 2 }} />
            <p className="text-sm leading-relaxed" style={{ color: COLORS.text }}>
              {reaction ? reaction.line : "Ajusta la oferta y dime qué tienes en mente."}
            </p>
          </div>

          <div className="text-xs" style={{ color: COLORS.muted }}>
            {ended
              ? (reaction?.zone === "dudoso" ? "Se lo pensará — te responderá en el próximo Gran Premio." : "La conversación ha terminado.")
              : `Te quedan ${attemptsLeft} de ${patience} intento${patience === 1 ? "" : "s"} antes de que se canse de negociar.`}
          </div>

          {/* Contrato actual — la referencia para saber en qué horquilla negociar */}
          {hasCurrentContract && (
            <div className="rounded-xl p-3 text-xs" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
              <div className="uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>Contrato actual con {currentTeamName}</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1" style={{ color: COLORS.text }}>
                <span>Sueldo: <span className="font-mono">€{Math.round(rider.salary || 0).toLocaleString()}/año</span></span>
                <span>Le quedan: <span className="font-mono">{contractYearsLeft} año{contractYearsLeft === 1 ? "" : "s"}</span></span>
                {rider.winBonus > 0 && <span>Bonus victoria: <span className="font-mono">€{Math.round(rider.winBonus).toLocaleString()}</span></span>}
                {rider.titleBonus > 0 && <span>Bonus título: <span className="font-mono">€{Math.round(rider.titleBonus).toLocaleString()}</span></span>}
              </div>
            </div>
          )}
          {isUnemployed && (
            <div className="rounded-xl p-3 text-xs" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, color: COLORS.muted }}>
              Sin equipo actual — como referencia, un sueldo justo para su nivel ronda los <span className="font-mono" style={{ color: COLORS.text }}>€{Math.round(fairSalary).toLocaleString()}/año</span>.
            </div>
          )}

          {/* Condiciones económicas */}
          {needsTeamDeal && (
            <div className="flex items-center justify-between text-sm rounded-lg px-3 py-2" style={{ background: `${COLORS.danger}18`, border: `1px solid ${COLORS.danger}` }}>
              <span style={{ color: COLORS.text }}>Rescisión de contrato con {currentTeamName}</span>
              <input type="number" value={teamOfferAmount} onChange={(e) => setTeamOfferAmount(Number(e.target.value))} disabled={ended}
                className="w-28 text-right font-mono px-2 py-1 rounded" style={{ background: COLORS.panel2, color: COLORS.danger, border: `1px solid ${COLORS.rule}` }} />
            </div>
          )}
          {isSplitMotoGpTeam && (
            <div>
              <div className="text-xs mb-1.5" style={{ color: COLORS.muted }}>Moto que le ofreces</div>
              <div className="grid grid-cols-2 gap-2">
                {["customerTop", "previous"].map((tier) => (
                  <button key={tier} disabled={ended} onClick={() => setOfferedBikeTier(tier)}
                    className="rounded-lg px-3 py-2 text-left text-xs disabled:opacity-60"
                    style={{ background: offeredBikeTier === tier ? `${COLORS.gold}18` : COLORS.panel2, border: `1px solid ${offeredBikeTier === tier ? COLORS.gold : COLORS.rule}` }}>
                    <div className="font-bold" style={{ color: COLORS.text }}>{MOTOGP_BIKE_TIER_LABELS[tier]}</div>
                    <div className="font-mono mt-0.5" style={{ color: offeredBikeTier === tier ? COLORS.gold : COLORS.muted }}>
                      {Math.round(tier === "previous" ? previousTierBikeAvg : bikeAvg(playerTeam.bike))}/100
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {canOfferTestRiderRole && (
            <div>
              <div className="text-xs mb-1.5" style={{ color: COLORS.muted }}>Rol que le ofreces</div>
              <div className="grid grid-cols-2 gap-2">
                {["titular", "probador"].map((role) => (
                  <button key={role} disabled={ended} onClick={() => setOfferedRole(role)}
                    className="rounded-lg px-3 py-2 text-left text-xs disabled:opacity-60"
                    style={{ background: offeredRole === role ? `${COLORS.gold}18` : COLORS.panel2, border: `1px solid ${offeredRole === role ? COLORS.gold : COLORS.rule}` }}>
                    <div className="font-bold" style={{ color: COLORS.text }}>{role === "titular" ? "Piloto titular" : "Piloto probador"}</div>
                    {role === "probador" && <div className="mt-0.5" style={{ color: COLORS.muted }}>Deja de competir — muchos pilotos lo rechazan</div>}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs" style={{ color: COLORS.muted }}>Sueldo anual (€)
              <input type="number" value={salary} disabled={ended} onChange={(e) => setSalary(Number(e.target.value))}
                className="px-2 py-1.5 rounded-lg font-mono" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
            </label>
            <label className="flex flex-col gap-1 text-xs" style={{ color: COLORS.muted }}>Años de contrato
              <input type="number" min={1} max={4} value={years} disabled={ended} onChange={(e) => setYears(clampInt(Number(e.target.value), 1, 4))}
                className="px-2 py-1.5 rounded-lg font-mono" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
            </label>
            <label className="flex flex-col gap-1 text-xs" style={{ color: COLORS.muted }}>Bonus por victoria (€)
              <input type="number" value={winBonus} disabled={ended} onChange={(e) => setWinBonus(Number(e.target.value))}
                className="px-2 py-1.5 rounded-lg font-mono" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
            </label>
            <label className="flex flex-col gap-1 text-xs" style={{ color: COLORS.muted }}>Bonus por título (€)
              <input type="number" value={titleBonus} disabled={ended} onChange={(e) => setTitleBonus(Number(e.target.value))}
                className="px-2 py-1.5 rounded-lg font-mono" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
            </label>
          </div>
        </div>

        <div className="p-4 flex-shrink-0" style={{ borderTop: `1px solid ${COLORS.rule}` }}>
          {ended ? (
            <button onClick={handleClose} className="w-full py-3 rounded-lg font-bold" style={{ background: COLORS.gold, color: COLORS.bg }}>
              Terminar conversación
            </button>
          ) : reaction?.zone === "dudoso" ? (
            // Bug fixed (feature request): once the rider asks for time
            // to think it over, the player was forced to keep sending
            // more offers until patience ran out — no way to just leave
            // that pending offer as it is and let him respond at the
            // next Grand Prix, which is exactly what "dudoso" already
            // means. Both options now sit side by side: push further
            // right now, or stop here and wait for his answer.
            <div className="flex gap-2">
              <button onClick={handleClose} className="flex-1 py-3 rounded-lg font-bold" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }}>
                Terminar conversación
              </button>
              <button onClick={handleSend} className="flex-1 py-3 rounded-lg font-bold" style={{ background: COLORS.gold, color: COLORS.bg }}>
                Plantear esta oferta
              </button>
            </div>
          ) : (
            <button onClick={handleSend} className="w-full py-3 rounded-lg font-bold" style={{ background: COLORS.gold, color: COLORS.bg }}>
              Plantear esta oferta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function clampPct(v) { return Math.max(2, Math.min(98, v)); }
function clampInt(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
