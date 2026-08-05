import { useEffect, useState } from "react";
import { AlertTriangle, Flag, Medal, Trophy, X } from "lucide-react";
import { CountryFlag } from "./CountryFlag.jsx";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { RiderNumber } from "./RiderNumber.jsx";
import { TeamLogo } from "./TeamLogo.jsx";
import { AttrGrid, RiderActionButton } from "./UIPrimitives.jsx";
import { CATEGORY_DATA, CATEGORY_ORDER } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { badgeEmoji, computeMarketValue, computeReleaseAtSeasonEndCost, computeSalary, fireRiderCost, isFreeAgentEligibleForCategory, overallRating } from "../utils/riders.js";
import { teamDisplayName } from "../utils/teamNaming.js";
import { nextSeasonCommittedRiderCount } from "../utils/marketNegotiations.js";
import { moraleTierInfo } from "../utils/riderMorale.js";
import { canStartScoutMission, SCOUT_OUT_OF_CATEGORY_COST } from "../utils/scouting.js";
import { clamp } from "../utils/random.js";
import { PRESTIGE_SCALE_MAX } from "../data/categoryPrestigeConfig.js";

/** Turns one entry of a negotiation's structured history (see
 * createNegotiation/resolvePendingNegotiations in
 * utils/marketNegotiations.js) into a short readable line for the
 * "historial de negociación" trail — Oferta inicial → Contraoferta del
 * equipo → Nueva oferta → Contraoferta del piloto → Aceptada, etc. */
function historyStepLabel(h) {
  if (h.actor === "player") {
    if (h.type === "withdraw") return "Retiraste la oferta.";
    if (h.type === "accept") return "Aceptaste la contraoferta.";
    const amount = h.teamOfferAmount != null ? `€${Math.round(h.teamOfferAmount).toLocaleString()} de compensación` : `€${Math.round(h.riderSalary || 0).toLocaleString()}/año`;
    return `Vuestra oferta: ${amount}.`;
  }
  const who = h.actor === "team" ? "El equipo" : "El piloto";
  if (h.type === "accept") return `${who} acepta.`;
  if (h.type === "reject") return `${who} rechaza.`;
  if (h.type === "counter") {
    const amount = h.teamOfferAmount != null ? `€${Math.round(h.teamOfferAmount).toLocaleString()}` : `€${Math.round(h.riderSalary || 0).toLocaleString()}/año`;
    return `${who} contraoferta: ${amount}.`;
  }
  return `${who} responde.`;
}

/** Turns one special-skill tag into a short readable label. Built to
 * extend cleanly: an unrecognized future tag type still shows something
 * reasonable via its own `label` field rather than breaking. */
function tagLabel(tag) {
  if (tag.type === "favoriteCircuit") return `Especialista en ${tag.circuitLabel || tag.circuit}`;
  if (tag.type === "wetSpecialist") return "Especialista en lluvia";
  return tag.label || "Habilidad especial";
}

export function RiderProfileModal({ target, onClose, isOwnRider, budget, onFireRider, playerTeam, category, onSignFreeAgent, marketNegotiations, onCreateOffer, canStartNewOffer, onMarkReleaseAtSeasonEnd, onAcceptCounterOffer, onModifyOffer, onWithdrawOffer, onSendScout, scale, onOpenTeamProfile, onTop = true }) {
  const [confirmFire, setConfirmFire] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [teamOfferAmount, setTeamOfferAmount] = useState(0);
  const [offerSalary, setOfferSalary] = useState(0);
  const [offerYears, setOfferYears] = useState(2);
  const [offerWinBonus, setOfferWinBonus] = useState(0);
  const [offerTitleBonus, setOfferTitleBonus] = useState(0);
  const [profileTab, setProfileTab] = useState("personal");

  // Resets the offer form to sensible suggested values every time a
  // different rider's profile is opened — unless there's already an
  // active counter-offer for this rider, in which case the form loads
  // whatever's currently on the table instead (see the design's "toda
  // la información anterior deberá mantenerse cargada").
  useEffect(() => {
    if (!target) return;
    const active = (marketNegotiations || []).find((n) => n.riderId === target.rider.id && n.toTeamId === "player" && ["team_countered", "rider_countered"].includes(n.status));
    if (active) {
      setTeamOfferAmount(active.teamOfferAmount ?? Math.round(computeMarketValue(target.rider, scale || 1) * 1.1));
      setOfferSalary(active.riderTerms?.salary ?? Math.round(computeSalary(target.rider, scale || 1) * 1.1));
      setOfferYears(active.riderTerms?.years ?? 2);
      setOfferWinBonus(active.riderTerms?.winBonus ?? 0);
      setOfferTitleBonus(active.riderTerms?.titleBonus ?? 0);
    } else {
      setTeamOfferAmount(Math.round(computeMarketValue(target.rider, scale || 1) * 1.1));
      setOfferSalary(Math.round(computeSalary(target.rider, scale || 1) * 1.1));
      setOfferYears(2);
      setOfferWinBonus(0);
      setOfferTitleBonus(0);
    }
    setShowOfferForm(false);
    setConfirmFire(false);
    setProfileTab("personal");
  }, [target?.rider?.id, scale]);

  if (!target) return null;
  const { rider, teamName, categoryKey, team: currentTeam } = target;
  const accent = COLORS.gold;
  const overall = overallRating(rider);
  const history = [...(rider.history || [])].reverse();
  const fireCost = fireRiderCost(rider);
  const releaseCost = computeReleaseAtSeasonEndCost(rider, scale || 1);
  const isFreeAgent = teamName === "Agente libre";
  const hasVacancy = !!(playerTeam && playerTeam.riders.length < 2);
  const signEligible = isFreeAgent && hasVacancy && !isOwnRider && isFreeAgentEligibleForCategory(rider, category);
  const signCost = Math.round(overallRating(rider) * 5000);
  const scoutReport = playerTeam?.scoutReports?.[rider.id];
  const knowsPotential = isOwnRider || !!scoutReport;
  const knowsMorale = isOwnRider || !!scoutReport?.moraleValue;
  const activeScoutMission = (playerTeam?.scoutingMissions || []).find((m) => m.riderId === rider.id);
  const scoutCost = categoryKey === category ? 0 : SCOUT_OUT_OF_CATEGORY_COST;
  const canScout = !isOwnRider && !!playerTeam && !activeScoutMission && canStartScoutMission(playerTeam, rider.id, categoryKey);

  // Live transfer market (utils/marketNegotiations.js): is there already
  // a negotiation in progress or confirmed for this rider WITH US
  // specifically? Used for the active-negotiation/counter-offer UI
  // below, which only ever applies when the player is the buyer.
  const existingNegotiation = (marketNegotiations || []).find((n) => n.riderId === rider.id && n.toTeamId === "player" && n.status !== "failed");
  // Single source of truth for "this rider's future is already
  // decided" — a confirmed signing or an already-applied renewal with
  // ANY team, not just the player's. Used for the informational banner
  // below (kept for renewals too — "ya ha renovado" should still show).
  const signedNegotiation = (marketNegotiations || []).find((n) => n.riderId === rider.id && ["confirmed", "applied"].includes(n.status));
  // A THIRD PARTY (a rival, or an AI-initiated offer on the player's own
  // rider) can be mid-negotiation for this exact rider without it being
  // "signed" yet — still very much live, and it's exactly what silently
  // blocked a renewal attempt before this fix: the player would see the
  // "Iniciar renovación" button, submit it, and nothing would happen,
  // because createPlayerOffer already (correctly) refuses to compete
  // with an in-progress non-renewal deal — it just never told anyone.
  // Surfacing it here means the button (and the reason for it) is
  // right the first time, instead of failing silently on submit.
  const rivalNegotiation = (marketNegotiations || []).find((n) => n.riderId === rider.id && n.toTeamId !== "player" && n.kind !== "renewal" && !["failed", "withdrawn"].includes(n.status));
  const isSignedWithPlayer = signedNegotiation?.toTeamId === "player";
  const isConfirmedForUs = isSignedWithPlayer;
  const isCounterOffer = ["team_countered", "rider_countered"].includes(existingNegotiation?.status);
  const contractYearsLeft = rider.contractYears ?? 0;
  // A team compensation step only ever makes sense when poaching someone
  // else's rider who still has more than one year left — never for a
  // renewal (nobody to compensate) and never for a rider down to their
  // last contracted year, who behaves exactly like a free agent for
  // negotiation purposes.
  const offerNeedsTeamDeal = !isOwnRider && contractYearsLeft > 1;
  const offerLabel = isOwnRider ? "Iniciar renovación de contrato" : (offerNeedsTeamDeal ? "Hacer una oferta" : "Intentar contratar");
  // A renewal with their CURRENT team never blocks a competing offer —
  // only an actual signing elsewhere (a real, specific commitment to a
  // different team) takes them fully off the market. The rider still
  // gets to weigh a genuinely better offer against the renewal they
  // already signed, same as the real market. An unresolved rival
  // negotiation blocks it too, exactly like createPlayerOffer already
  // enforces — now visibly, not just silently.
  const blocksNewOffer = signedNegotiation && (signedNegotiation.kind !== "renewal" || isSignedWithPlayer);
  const offerEligible = !existingNegotiation && !blocksNewOffer && isFreeAgentEligibleForCategory(rider, category)
    && (isOwnRider ? !rider.releasedAtSeasonEnd : canStartNewOffer);
  // Once both of next season's seats are already committed through firm
  // contracts (staying riders + confirmed incoming signings), undoing a
  // "designar para quedar libre" would over-commit the roster to 3
  // riders for 2 spots — the exact scenario this fix closes.
  const nextSeasonCommittedCount = nextSeasonCommittedRiderCount(playerTeam, marketNegotiations, "player");
  const rosterPlanningLocked = nextSeasonCommittedCount >= 2;

  // Shared input fields for both a fresh offer and a counter-offer
  // revision — same parameters either way (section 1: "el jugador podrá
  // cambiar cualquier parámetro de la negociación").
  function renderOfferFields(showTeamField) {
    return (
      <>
        {showTeamField && (
          <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>Oferta al equipo (compensación)
            <input type="number" value={teamOfferAmount} onChange={(e) => setTeamOfferAmount(Number(e.target.value))}
              className="px-2 py-1 rounded font-mono" style={{ background: COLORS.panel, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
          </label>
        )}
        <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>Salario ofrecido / año
          <input type="number" value={offerSalary} onChange={(e) => setOfferSalary(Number(e.target.value))}
            className="px-2 py-1 rounded font-mono" style={{ background: COLORS.panel, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>Años
            <input type="number" min={1} max={4} value={offerYears} onChange={(e) => setOfferYears(clamp(Number(e.target.value), 1, 4))}
              className="px-2 py-1 rounded font-mono" style={{ background: COLORS.panel, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
          </label>
          <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>Bonus victoria
            <input type="number" value={offerWinBonus} onChange={(e) => setOfferWinBonus(Number(e.target.value))}
              className="px-2 py-1 rounded font-mono" style={{ background: COLORS.panel, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
          </label>
          <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>Bonus título
            <input type="number" value={offerTitleBonus} onChange={(e) => setOfferTitleBonus(Number(e.target.value))}
              className="px-2 py-1 rounded font-mono" style={{ background: COLORS.panel, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
          </label>
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", zIndex: onTop ? 70 : 60 }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border" style={{ background: COLORS.panel, borderColor: COLORS.rule, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 pb-4 flex-shrink-0 relative overflow-hidden" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
          {rider.number != null && (
            <div className="absolute inset-0 flex items-center justify-end pr-14 pointer-events-none" style={{ opacity: 0.1 }}>
              <RiderNumber rider={rider} size={220} plain categoryKey={categoryKey} />
            </div>
          )}
          <div className="flex items-center gap-3 min-w-0 relative">
            <div className="flex flex-col items-center gap-0 flex-shrink-0">
              <div className="flex items-center justify-center rounded-xl overflow-hidden" style={{ width: 88, height: 88, border: `2px solid ${accent}` }}>
                <RiderPhoto rider={rider} size={88} />
              </div>
              <RiderNumber rider={rider} size={56} className="-mt-1" plain categoryKey={categoryKey} />
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-bold flex items-center gap-2 truncate" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                {rider.nat && <CountryFlag nat={rider.nat} width={24} />} {rider.name}
              </h3>
              <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{teamName || "Sin equipo"} {categoryKey ? `· ${CATEGORY_DATA[categoryKey]?.label}` : ""} · {rider.age} años {rider.personality ? `· ${rider.personality}` : ""}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-full flex-shrink-0 relative transition-transform active:scale-90" style={{ background: COLORS.panel2, color: COLORS.muted }}><X size={18} /></button>
        </div>

        <div className="flex gap-1.5 px-5 pt-3 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
          {[["personal", "Datos personales"], ["contrato", "Contrato"], ["trayectoria", "Trayectoria"]].filter(([key]) => key !== "contrato" || !rider.retired).map(([key, label]) => (
            <button key={key} onClick={() => setProfileTab(key)}
              className="text-xs px-3 py-2 rounded-t-lg font-semibold transition-colors"
              style={{
                background: profileTab === key ? COLORS.panel2 : "transparent",
                color: profileTab === key ? accent : COLORS.muted,
                borderBottom: profileTab === key ? `2px solid ${accent}` : "2px solid transparent",
                fontFamily: "Rajdhani, sans-serif",
              }}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 pt-4" style={{ height: "56vh", overflowY: "auto" }}>

        {profileTab === "personal" && (
          <>
            <div className="flex gap-6 mb-4">
              <div>
                <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Media (CA)</div>
                <div className="text-3xl font-mono" style={{ color: accent }}>{overall}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Potencial (PA)</div>
                {knowsPotential ? (
                  <div className="text-3xl font-mono" style={{ color: COLORS.text }}>{isOwnRider ? rider.pa : `${scoutReport.potentialRange[0]}–${scoutReport.potentialRange[1]}`}</div>
                ) : (
                  <div className="text-3xl font-mono" style={{ color: COLORS.muted }}>?</div>
                )}
              </div>
            </div>

            {rider.expectation && (
              <div className="text-xs mb-1" style={{ color: COLORS.muted }}>
                Expectativa temporada: <span style={{ color: COLORS.text }}>{rider.expectation}</span>
              </div>
            )}
            <div className="text-xs mb-1" style={{ color: COLORS.muted }}>
              Moral: {knowsMorale
                ? <span style={{ color: moraleTierInfo(rider.moraleState?.tier).color, fontWeight: 600 }}>{moraleTierInfo(rider.moraleState?.tier).label}</span>
                : <span style={{ color: COLORS.muted }}>?</span>}
            </div>
            <div className="text-xs mb-4" style={{ color: COLORS.muted }}>
              Prestigio: <span style={{ color: COLORS.text, fontWeight: 600 }}>{Number.isFinite(rider.prestige) ? `${rider.prestige} / ${PRESTIGE_SCALE_MAX}` : "—"}</span>
            </div>

            {rider.injury && rider.injury.gpRemaining > 0 && (
              <div className="mb-4 rounded-md p-2.5 text-xs flex items-center gap-2" style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}`, color: COLORS.danger }}>
                <AlertTriangle size={14} />
                Lesión {rider.injury.severityLabel} ({rider.injury.name}) · {rider.injury.gpRemaining} GP restante{rider.injury.gpRemaining === 1 ? "" : "s"}
                {rider.injury.sidelined ? "" : " · sigue compitiendo con el rendimiento mermado"}
              </div>
            )}

            <AttrGrid rider={rider} accent={accent} />

            {rider.tags && rider.tags.length > 0 && (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Habilidades especiales</div>
                <div className="flex flex-wrap gap-1.5">
                  {rider.tags.map((tag, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "rgba(227,164,39,0.14)", border: `1px solid ${accent}`, color: accent }}>
                      {tagLabel(tag)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {profileTab === "contrato" && (
          <>
            {!isOwnRider && (
              <div className="mb-4 rounded-md p-2.5" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                <div className="text-xs uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>Informe de ojeo</div>
                {scoutReport ? (
                  <ul className="text-xs space-y-1 mb-2" style={{ color: COLORS.text }}>
                    {scoutReport.assessment.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                ) : (
                  <p className="text-xs mb-2" style={{ color: COLORS.muted }}>Sin ojear todavía. No sabes si encajaría en tu equipo, ni si estaría interesada en fichar.</p>
                )}
                {activeScoutMission ? (
                  <div className="text-xs" style={{ color: accent }}>Ojeador en misión — informe en {activeScoutMission.weeksRemaining} semana{activeScoutMission.weeksRemaining === 1 ? "" : "s"}.</div>
                ) : (
                  <button disabled={!canScout} onClick={() => onSendScout(rider, categoryKey)}
                    className="text-xs px-3 py-1.5 rounded disabled:opacity-30"
                    style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
                    Enviar ojeador{scoutCost > 0 ? ` (€${scoutCost.toLocaleString()})` : " (gratis, misma categoría)"}
                  </button>
                )}
              </div>
            )}

            {!isFreeAgent && currentTeam && (
              <button onClick={() => onOpenTeamProfile?.(currentTeam, categoryKey)}
                className="w-full mb-4 text-left rounded-md p-3 flex items-center gap-3 hover:opacity-80"
                style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                <TeamLogo team={currentTeam} size={44} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{teamName}</div>
                  <div className="text-xs" style={{ color: COLORS.muted }}>
                    {currentTeam.tier}{currentTeam.manufacturer ? ` · ${currentTeam.manufacturer}` : ""} · Ver escudería
                  </div>
                </div>
              </button>
            )}

            <div className="grid grid-cols-3 gap-2 mb-4 text-xs" style={{ color: COLORS.muted }}>
              <div className="rounded-md p-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                <div className="uppercase">Contrato</div>
                <div className="font-mono text-sm" style={{ color: (rider.contractYears ?? 0) > 0 ? COLORS.text : COLORS.muted }}>
                  {(rider.contractYears ?? 0) > 0 ? `${rider.contractYears} año${rider.contractYears === 1 ? "" : "s"}` : "Sin contrato"}
                </div>
              </div>
              <div className="rounded-md p-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                <div className="uppercase">Salario/año</div>
                <div className="font-mono text-sm" style={{ color: COLORS.text }}>€{(rider.salary || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-md p-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                <div className="uppercase">Valor de mercado</div>
                <div className="font-mono text-sm" style={{ color: COLORS.text }}>€{(rider.marketValue || 0).toLocaleString()}</div>
              </div>
            </div>

            {isConfirmedForUs && signedNegotiation.status === "confirmed" && (
              <div className="mb-3 rounded-md p-2.5 text-xs" style={{ background: "rgba(63,145,66,0.12)", border: "1px solid #3F9142", color: "#3F9142" }}>
                Ha firmado por {playerTeam ? teamDisplayName(playerTeam) : "vuestro equipo"} para la próxima temporada.
              </div>
            )}
            {isConfirmedForUs && signedNegotiation.status === "applied" && (
              <div className="mb-3 rounded-md p-2.5 text-xs" style={{ background: "rgba(63,145,66,0.12)", border: "1px solid #3F9142", color: "#3F9142" }}>
                Renovación firmada — el contrato ya está actualizado.
              </div>
            )}
            {signedNegotiation && !isSignedWithPlayer && (
              <div className="mb-3 rounded-md p-2.5 text-xs" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
                {signedNegotiation.kind === "renewal"
                  ? `Este piloto ya ha renovado con ${signedNegotiation.toTeamName} para la próxima temporada.`
                  : `Este piloto ya ha firmado con ${signedNegotiation.toTeamName} para la próxima temporada.`}
              </div>
            )}
            {!signedNegotiation && rivalNegotiation && (
              <div className="mb-3 rounded-md p-2.5 text-xs" style={{ background: "rgba(224,142,69,0.12)", border: "1px solid #E08E45", color: "#E08E45" }}>
                {rivalNegotiation.toTeamName} también está negociando con este piloto ahora mismo. Si presentáis vuestra propia oferta, entráis en pugna directa por él — el piloto elegirá la que más le convenza, así que puede que no sea la vuestra.
              </div>
            )}
            {existingNegotiation && !signedNegotiation && !isCounterOffer && (
              <div className="mb-3 rounded-md p-2.5 text-xs" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, color: COLORS.muted }}>
                Negociación en curso — os avisaremos tras el próximo Gran Premio.
              </div>
            )}

            {isCounterOffer && (onAcceptCounterOffer || onModifyOffer || onWithdrawOffer) && (
              <div className="mb-3 rounded-md p-3 text-xs space-y-2" style={{ background: COLORS.panel2, border: "1px solid #E08E45" }}>
                <div className="font-semibold" style={{ color: "#E08E45" }}>Contraoferta recibida</div>
                {existingNegotiation.status === "team_countered" && (
                  <p style={{ color: COLORS.text }}>{existingNegotiation.fromTeamName} pide €{Math.round(existingNegotiation.teamOfferAmount).toLocaleString()} de compensación.</p>
                )}
                {existingNegotiation.status === "rider_countered" && (
                  <p style={{ color: COLORS.text }}>{rider.name} pide €{Math.round(existingNegotiation.riderTerms.salary).toLocaleString()}/año.</p>
                )}

                <div className="text-xs" style={{ color: COLORS.muted }}>
                  {(existingNegotiation.history || []).map((h, i) => (
                    <div key={i}>{historyStepLabel(h)}</div>
                  ))}
                </div>

                {renderOfferFields(existingNegotiation.status === "team_countered")}

                <div className="flex gap-2 pt-1">
                  {onAcceptCounterOffer && (
                    <button onClick={() => onAcceptCounterOffer(existingNegotiation.id)}
                      className="flex-1 py-1.5 rounded font-semibold" style={{ background: "#3F9142", color: "#fff" }}>
                      Aceptar
                    </button>
                  )}
                  {onModifyOffer && (
                    <button
                      onClick={() => onModifyOffer(existingNegotiation.id, teamOfferAmount, { salary: offerSalary, years: offerYears, winBonus: offerWinBonus, titleBonus: offerTitleBonus })}
                      className="flex-1 py-1.5 rounded font-semibold" style={{ background: "#E08E45", color: "#12151A" }}>
                      Modificar
                    </button>
                  )}
                  {onWithdrawOffer && (
                    <button onClick={() => onWithdrawOffer(existingNegotiation.id)} className="flex-1 py-1.5 rounded" style={{ background: COLORS.panel, color: COLORS.danger }}>
                      Retirar
                    </button>
                  )}
                </div>
                <p style={{ color: COLORS.muted }}>Si modificás la oferta, la respuesta llegará tras el próximo Gran Premio.</p>
              </div>
            )}

            {offerEligible && !existingNegotiation && onCreateOffer && !showOfferForm && (
              <RiderActionButton tone="green" onClick={() => setShowOfferForm(true)}>
                {offerLabel}
              </RiderActionButton>
            )}

            {offerEligible && !existingNegotiation && onCreateOffer && showOfferForm && (
              <div className="mb-3 rounded-md p-3 text-xs space-y-2" style={{ background: COLORS.panel2, border: "1px solid #3F9142" }}>
                {renderOfferFields(offerNeedsTeamDeal)}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      onCreateOffer(rider, categoryKey, offerNeedsTeamDeal ? teamOfferAmount : null, { salary: offerSalary, years: offerYears, winBonus: offerWinBonus, titleBonus: offerTitleBonus });
                      setShowOfferForm(false);
                    }}
                    className="flex-1 py-1.5 rounded font-semibold" style={{ background: "#3F9142", color: "#fff" }}>
                    Enviar oferta
                  </button>
                  <button onClick={() => setShowOfferForm(false)} className="flex-1 py-1.5 rounded" style={{ background: COLORS.panel, color: COLORS.muted }}>
                    Cancelar
                  </button>
                </div>
                <p style={{ color: COLORS.muted }}>La respuesta llegará tras disputarse el próximo Gran Premio.</p>
              </div>
            )}

            {signEligible && onSignFreeAgent && (
              <button onClick={() => onSignFreeAgent(rider)} disabled={signCost > budget}
                className="w-full mb-3 text-xs px-3 py-2 rounded disabled:opacity-40 font-semibold"
                style={{ background: accent, color: "#12151A" }}>
                Fichar por {teamDisplayName(playerTeam)} — €{signCost.toLocaleString()}
              </button>
            )}

            {isOwnRider && onFireRider && !confirmFire && (
              <RiderActionButton tone="red" onClick={() => setConfirmFire(true)} disabled={fireCost > budget}>
                Despedir — €{fireCost.toLocaleString()}
              </RiderActionButton>
            )}

            {isOwnRider && onFireRider && confirmFire && (
              <div className="mb-3 rounded-md p-3 text-xs" style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}` }}>
                <p className="mb-2" style={{ color: COLORS.text }}>
                  ¿Rescindir el contrato de {rider.name}? Abandonará la escudería de inmediato y pasará al mercado de pilotos libres. El coste de la rescisión (€{fireCost.toLocaleString()}) se descontará del presupuesto ahora mismo.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => onFireRider(rider.id)} disabled={fireCost > budget}
                    className="flex-1 py-1.5 rounded font-semibold disabled:opacity-40"
                    style={{ background: COLORS.danger, color: "#fff" }}>
                    Confirmar despido
                  </button>
                  <button onClick={() => setConfirmFire(false)} className="flex-1 py-1.5 rounded" style={{ background: COLORS.panel2, color: COLORS.muted }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {isOwnRider && onMarkReleaseAtSeasonEnd && !rider.releasedAtSeasonEnd && (
              <RiderActionButton tone="blue" onClick={() => onMarkReleaseAtSeasonEnd(rider.id, true)} disabled={releaseCost > budget}>
                Designar para quedar libre al final de temporada{releaseCost > 0 ? ` — €${releaseCost.toLocaleString()}` : ""}
              </RiderActionButton>
            )}
            {isOwnRider && onMarkReleaseAtSeasonEnd && rider.releasedAtSeasonEnd && (
              <div className="mb-3 rounded-md p-2.5 text-xs" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, color: COLORS.muted }}>
                <div className="flex items-center justify-between gap-2">
                  <span>Dejará el equipo al finalizar la temporada.</span>
                  <button onClick={() => onMarkReleaseAtSeasonEnd(rider.id, false)} disabled={rosterPlanningLocked}
                    className="underline-none font-semibold flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed" style={{ color: rosterPlanningLocked ? COLORS.muted : accent }}>
                    Deshacer
                  </button>
                </div>
                {rosterPlanningLocked && (
                  <div className="mt-1.5" style={{ color: COLORS.muted }}>
                    No es posible deshacer esta acción porque la plantilla de la próxima temporada ya está completa.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {profileTab === "trayectoria" && (
          <>
            <div className="space-y-2 my-4">
              {CATEGORY_ORDER.filter((ck) => ck !== "worldwcr" || rider.gender === "F").map((ck) => {
                const races = rider.careerRaces?.[ck] || 0;
                const podiums = rider.careerPodiums?.[ck] || 0;
                const wins = rider.careerWins?.[ck] || 0;
                const active = races > 0;
                return (
                  <div key={ck}>
                    <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, opacity: active ? 1 : 0.55 }}>
                      <div className="font-semibold text-sm truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: active ? COLORS.text : COLORS.muted }}>{CATEGORY_DATA[ck].label}</div>
                      <div className="flex items-center gap-5 flex-shrink-0">
                        <TrajectoryStat icon={Flag} value={races} label="Carreras" />
                        <TrajectoryStat icon={Medal} value={podiums} label="Podios" />
                        <TrajectoryStat icon={Trophy} value={wins} label="Victorias" accent={wins > 0 ? COLORS.gold : undefined} />
                      </div>
                    </div>
                    {ck === "motogp" && (rider.careerSprintWins?.motogp || rider.careerSprintPodiums?.motogp) > 0 && (
                      <div className="rounded-xl px-4 py-3 mt-2 flex items-center justify-between gap-3 ml-3" style={{ background: "transparent", border: `1px dashed ${COLORS.rule}` }}>
                        <div className="text-xs truncate" style={{ color: COLORS.muted }}>↳ Sprints MotoGP</div>
                        <div className="flex items-center gap-5 flex-shrink-0">
                          <TrajectoryStat icon={Medal} value={rider.careerSprintPodiums?.motogp || 0} label="Podios" />
                          <TrajectoryStat icon={Trophy} value={rider.careerSprintWins?.motogp || 0} label="Victorias" accent={(rider.careerSprintWins?.motogp || 0) > 0 ? COLORS.gold : undefined} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: COLORS.muted }}>
                <Medal size={13} /> Historial de temporadas
              </div>
              {history.length === 0 && <p className="text-sm" style={{ color: COLORS.muted }}>Aún no ha completado ninguna temporada en la partida.</p>}
              <div className="space-y-1.5">
                {history.map((h, i) => {
                  const emoji = badgeEmoji(h.badge);
                  return (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: COLORS.panel2, border: `1px solid ${h.badge ? COLORS.gold : COLORS.rule}` }}>
                      <span className="truncate" style={{ color: COLORS.text }}>
                        <span className="font-mono" style={{ color: COLORS.muted }}>T{h.season}</span> · {CATEGORY_DATA[h.category]?.label} · {h.teamName}
                      </span>
                      <span className="flex items-center gap-1.5 flex-shrink-0 font-mono" style={{ color: h.badge ? COLORS.gold : COLORS.muted }}>
                        {h.position}º · {h.points ?? 0} pts {emoji && <span className="text-base leading-none">{emoji}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        </div>
      </div>
    </div>
  );
}

/** Small icon-over-number stat, used to lay out races/podiums/victorias
 * side by side in the Trayectoria tab's per-category rows without
 * cramming them into a single line of text. */
function TrajectoryStat({ icon: Icon, value, label, accent }) {
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 46 }}>
      <div className="font-mono font-bold text-base leading-tight" style={{ color: accent || COLORS.text }}>{value}</div>
      <div className="text-[9px] uppercase tracking-wide flex items-center gap-1 mt-0.5" style={{ color: COLORS.muted }}>
        <Icon size={10} /> {label}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Main App                                                                */
/* ---------------------------------------------------------------------- */
/* Merges new notification items into the existing per-category histories
   (newest first, capped at 50 each). Pure function so it can be used both
   from the pushNotifications wrapper and directly inside a setGame
   functional update (e.g. runRace, which needs to commit everything in a
   single state update). */

