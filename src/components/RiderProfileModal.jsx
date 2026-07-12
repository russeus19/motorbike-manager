import { useEffect, useState } from "react";
import { AlertTriangle, Medal, X } from "lucide-react";
import { CountryFlag } from "./CountryFlag.jsx";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { AttrGrid, RiderActionButton } from "./UIPrimitives.jsx";
import { CATEGORY_DATA, CATEGORY_ORDER } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { badgeEmoji, computeMarketValue, computeReleaseAtSeasonEndCost, computeSalary, fireRiderCost, isFreeAgentEligibleForCategory, overallRating } from "../utils/riders.js";
import { moraleTierInfo } from "../utils/riderMorale.js";
import { clamp } from "../utils/random.js";

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

export function RiderProfileModal({ target, onClose, isOwnRider, budget, onFireRider, playerTeam, category, onSignFreeAgent, marketNegotiations, onCreateOffer, canStartNewOffer, onMarkReleaseAtSeasonEnd, onAcceptCounterOffer, onModifyOffer, onWithdrawOffer, scale }) {
  const [confirmFire, setConfirmFire] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [teamOfferAmount, setTeamOfferAmount] = useState(0);
  const [offerSalary, setOfferSalary] = useState(0);
  const [offerYears, setOfferYears] = useState(2);
  const [offerWinBonus, setOfferWinBonus] = useState(0);
  const [offerTitleBonus, setOfferTitleBonus] = useState(0);

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
  }, [target?.rider?.id, scale]);

  if (!target) return null;
  const { rider, teamName, categoryKey } = target;
  const accent = COLORS.gold;
  const overall = overallRating(rider);
  const history = [...(rider.history || [])].reverse();
  const fireCost = fireRiderCost(rider);
  const releaseCost = computeReleaseAtSeasonEndCost(rider, scale || 1);
  const isFreeAgent = teamName === "Agente libre";
  const hasVacancy = !!(playerTeam && playerTeam.riders.length < 2);
  const signEligible = isFreeAgent && hasVacancy && !isOwnRider && isFreeAgentEligibleForCategory(rider, category);
  const signCost = Math.round(overallRating(rider) * 5000);

  // Live transfer market (utils/marketNegotiations.js): is there already
  // a negotiation in progress or confirmed for this rider with us? A
  // renewal (fromTeamId === toTeamId === "player") is found the exact
  // same way — it's just another negotiation.
  const existingNegotiation = (marketNegotiations || []).find((n) => n.riderId === rider.id && n.toTeamId === "player" && n.status !== "failed");
  const isConfirmedForUs = ["confirmed", "applied"].includes(existingNegotiation?.status);
  const isCounterOffer = ["team_countered", "rider_countered"].includes(existingNegotiation?.status);
  const contractYearsLeft = rider.contractYears ?? 0;
  // A team compensation step only ever makes sense when poaching someone
  // else's rider who still has more than one year left — never for a
  // renewal (nobody to compensate) and never for a rider down to their
  // last contracted year, who behaves exactly like a free agent for
  // negotiation purposes.
  const offerNeedsTeamDeal = !isOwnRider && contractYearsLeft > 1;
  const offerLabel = isOwnRider ? "Iniciar renovación de contrato" : (offerNeedsTeamDeal ? "Hacer una oferta" : "Intentar contratar");
  const offerEligible = !existingNegotiation && isFreeAgentEligibleForCategory(rider, category)
    && (isOwnRider ? !rider.releasedAtSeasonEnd : canStartNewOffer);

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border" style={{ background: COLORS.panel, borderColor: COLORS.rule, maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
          <div className="flex items-center gap-3 min-w-0">
            <RiderPhoto rider={rider} size={88} className="rounded-xl" />
            <div className="min-w-0">
              <h3 className="text-2xl font-bold flex items-center gap-2 truncate" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                {rider.nat && <CountryFlag nat={rider.nat} width={24} />} {rider.name}
              </h3>
              <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{teamName || "Sin equipo"} {categoryKey ? `· ${CATEGORY_DATA[categoryKey]?.label}` : ""} · {rider.age} años {rider.personality ? `· ${rider.personality}` : ""}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-full flex-shrink-0" style={{ background: COLORS.panel2, color: COLORS.muted }}><X size={18} /></button>
        </div>

        <div className="p-5 pt-4" style={{ overflowY: "auto" }}>
        <div className="flex gap-6 mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Media (CA)</div>
            <div className="text-3xl font-mono" style={{ color: accent }}>{overall}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Potencial (PA)</div>
            <div className="text-3xl font-mono" style={{ color: COLORS.text }}>{rider.pa}</div>
          </div>
        </div>

        {rider.expectation && (
          <div className="text-xs mb-1" style={{ color: COLORS.muted }}>
            Expectativa temporada: <span style={{ color: COLORS.text }}>{rider.expectation}</span>
          </div>
        )}
        <div className="text-xs mb-4" style={{ color: COLORS.muted }}>
          Moral: <span style={{ color: moraleTierInfo(rider.moraleState?.tier).color, fontWeight: 600 }}>{moraleTierInfo(rider.moraleState?.tier).label}</span>
        </div>

        <AttrGrid rider={rider} accent={accent} />

        <div className="grid grid-cols-3 gap-2 my-3 text-xs" style={{ color: COLORS.muted }}>
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

        {rider.injury && rider.injury.gpRemaining > 0 && (
          <div className="mb-3 rounded-md p-2.5 text-xs flex items-center gap-2" style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}`, color: COLORS.danger }}>
            <AlertTriangle size={14} />
            Lesión {rider.injury.severityLabel} ({rider.injury.name}) · {rider.injury.gpRemaining} GP restante{rider.injury.gpRemaining === 1 ? "" : "s"}
            {rider.injury.sidelined ? "" : " · sigue compitiendo con el rendimiento mermado"}
          </div>
        )}

        {isConfirmedForUs && existingNegotiation.status === "confirmed" && (
          <div className="mb-3 rounded-md p-2.5 text-xs" style={{ background: "rgba(63,145,66,0.12)", border: "1px solid #3F9142", color: "#3F9142" }}>
            Ha firmado por {playerTeam?.name || "vuestro equipo"} para la próxima temporada.
          </div>
        )}
        {isConfirmedForUs && existingNegotiation.status === "applied" && (
          <div className="mb-3 rounded-md p-2.5 text-xs" style={{ background: "rgba(63,145,66,0.12)", border: "1px solid #3F9142", color: "#3F9142" }}>
            Renovación firmada — el contrato ya está actualizado.
          </div>
        )}
        {existingNegotiation && !isConfirmedForUs && !isCounterOffer && (
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
            Fichar por {playerTeam.name} — €{signCost.toLocaleString()}
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
          <div className="mb-3 rounded-md p-2.5 text-xs flex items-center justify-between gap-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, color: COLORS.muted }}>
            <span>Dejará el equipo al finalizar la temporada.</span>
            <button onClick={() => onMarkReleaseAtSeasonEnd(rider.id, false)} className="underline-none font-semibold flex-shrink-0" style={{ color: accent }}>Deshacer</button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 my-4">
          {CATEGORY_ORDER.map((ck) => (
            <div key={ck} className="rounded-md p-2 text-center" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
              <div className="text-xs uppercase" style={{ color: COLORS.muted }}>{CATEGORY_DATA[ck].label}</div>
              <div className="font-mono text-sm">{rider.careerWins?.[ck] || 0}V · {rider.careerPodiums?.[ck] || 0}P</div>
            </div>
          ))}
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: COLORS.muted }}>
            <Medal size={13} /> Historial de temporadas
          </div>
          {history.length === 0 && <p className="text-sm" style={{ color: COLORS.muted }}>Aún no ha completado ninguna temporada en la partida.</p>}
          <ul className="text-sm space-y-1">
            {history.map((h, i) => (
              <li key={i} className="flex justify-between">
                <span>T{h.season} · {CATEGORY_DATA[h.category]?.label} · {h.teamName}</span>
                <span>{h.position}º · {h.points ?? 0} pts {badgeEmoji(h.badge)}</span>
              </li>
            ))}
          </ul>
        </div>
        </div>
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

