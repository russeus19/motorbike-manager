import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { ManufacturerLogo } from "./ManufacturerLogo.jsx";
import { COLORS } from "../data/colors.js";
import { MANUFACTURER_DIALOGUE } from "../data/manufacturerDialogue.js";
import { thermometerZone } from "../utils/negotiationDialogue.js";
import {
  MANUFACTURER_REQUEST_TYPES, availableManufacturerRequests, computeManufacturerRequestScore,
  computeOtherManufacturerInterest, otherManufacturerCandidates, ensureManufacturerContract, manufacturerBikeOffer,
} from "../utils/manufacturerNegotiation.js";
import { MOTOGP_BIKE_TIER_LABELS } from "../data/motogpBikeTiers.js";
import { teamDisplayName } from "../utils/teamNaming.js";

const ZONE_COLOR = { frio: COLORS.danger, dudoso: COLORS.gold, favorable: COLORS.success };
const ZONE_LABEL = { frio: "Frío", dudoso: "Dudoso", favorable: "Favorable" };

function pickLine(zone, usedLines) {
  const bank = MANUFACTURER_DIALOGUE[zone];
  const fresh = bank.filter((l) => !usedLines.includes(l));
  const pool = fresh.length ? fresh : bank;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * "Contactar con [Fabricante]" — the MotoGP satellite-team side of
 * this session's own manufacturer/customer-bike design: renew the
 * multi-year deal, press for more attention on the packages you're
 * sent, ask to be pulled up from previous to customerTop, or sound
 * out a switch to a rival manufacturer entirely.
 *
 * Bug fixed (feature): "sondear otras marcas" used to skip straight
 * to a thermometer scored against the team's OWN current
 * manufacturer — Ducati deciding whether the team is allowed to talk
 * to KTM never made sense. It's now its own extra step: pick which
 * OTHER manufacturer to approach first (each shown with its own logo,
 * nothing about their actual interest revealed until you ask), THEN
 * that specific manufacturer judges the team independently, via
 * computeOtherManufacturerInterest — completely separate math from
 * how the team's current manufacturer judges every other request.
 *
 * onResolve(requestType, outcome, targetManufacturer) — called once a
 * request has been sent and answered; targetManufacturer is only ever
 * set for a switchManufacturer attempt, and only the caller applies
 * real consequences (see utils/manufacturerNegotiation.js's own
 * applyManufacturerRequestSuccess) for a "favorable" outcome.
 */
export function ManufacturerNegotiationScreen({ team, categoryKey, riderStandings, motogpSeatTiers, allMotoGpTeams, accent, onResolve, onClose }) {
  const contract = ensureManufacturerContract(team, categoryKey);
  const requestTypes = availableManufacturerRequests(team, categoryKey, motogpSeatTiers);

  const [requestType, setRequestType] = useState(null);
  const [targetManufacturer, setTargetManufacturer] = useState(null);
  const [usedLines, setUsedLines] = useState([]);
  const [reaction, setReaction] = useState(null);

  const isSwitch = requestType === "switchManufacturer";
  // Waiting on a manufacturer pick before there's anything to score at
  // all — the picker screen below handles this case on its own.
  const awaitingTargetPick = isSwitch && !targetManufacturer;

  function computeScore() {
    return isSwitch
      ? computeOtherManufacturerInterest(team, riderStandings, targetManufacturer, allMotoGpTeams, motogpSeatTiers)
      : computeManufacturerRequestScore(requestType, team, riderStandings, categoryKey);
  }

  const liveScore = requestType && !awaitingTargetPick ? computeScore() : null;
  const liveZone = liveScore != null ? thermometerZone(liveScore) : null;
  const liveOffer = isSwitch && liveScore != null ? manufacturerBikeOffer(liveScore) : null;

  function handleSend() {
    if (!requestType || reaction || awaitingTargetPick) return;
    const score = computeScore();
    const zone = thermometerZone(score);
    const outcome = zone === "favorable";
    const line = pickLine(zone, usedLines);
    setUsedLines((prev) => [...prev.slice(-3), line]);
    setReaction({ zone, line, outcome });
    onResolve(requestType, outcome, isSwitch ? targetManufacturer : undefined, isSwitch ? manufacturerBikeOffer(score) : undefined);
  }

  function handleClose() {
    onClose();
  }

  function handleBack() {
    if (isSwitch && targetManufacturer && !reaction) { setTargetManufacturer(null); return; }
    setRequestType(null);
  }

  const speakingWith = isSwitch && targetManufacturer ? targetManufacturer : team.manufacturer;
  const zoneColor = reaction ? ZONE_COLOR[reaction.zone] : liveZone ? ZONE_COLOR[liveZone] : COLORS.muted;
  const pct = reaction ? (reaction.zone === "favorable" ? 95 : reaction.zone === "frio" ? 5 : 50) : liveScore != null ? clampPct(Math.round((liveScore - 0.03) / (0.95 - 0.03) * 100)) : 50;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: "rgba(0,0,0,0.65)" }} onClick={handleClose}>
      <div className="w-full max-w-lg rounded-2xl border flex flex-col" style={{ background: COLORS.bg, borderColor: COLORS.rule, maxHeight: "85vh", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }} onClick={(e) => e.stopPropagation()}>
        <div className="relative flex items-center gap-4 p-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
          <button onClick={handleClose} className="absolute right-4 top-5" aria-label="Cerrar conversación">
            <X size={20} style={{ color: COLORS.muted }} />
          </button>
          <ManufacturerLogo name={speakingWith} accent={accent} size={60} />
          <div className="min-w-0">
            <div className="text-lg font-bold leading-tight" style={{ color: COLORS.text, fontFamily: "Rajdhani, sans-serif" }}>{speakingWith}</div>
            <div className="text-sm mt-1" style={{ color: COLORS.muted }}>{teamDisplayName(team)}</div>
            {contract && !isSwitch && (
              <div className="text-xs mt-1" style={{ color: COLORS.gold }}>
                Contrato: {contract.yearsLeft} temporada{contract.yearsLeft === 1 ? "" : "s"} restante{contract.yearsLeft === 1 ? "" : "s"}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {!requestType ? (
            <div className="space-y-2">
              <p className="text-sm mb-1" style={{ color: COLORS.muted }}>¿Qué queréis plantearle a la fábrica?</p>
              {requestTypes.map((key) => (
                <button key={key} onClick={() => setRequestType(key)}
                  className="w-full text-left rounded-xl p-3" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
                  <div className="text-sm font-bold mb-0.5" style={{ color: COLORS.text }}>{MANUFACTURER_REQUEST_TYPES[key].label}</div>
                  <div className="text-xs" style={{ color: COLORS.muted }}>{MANUFACTURER_REQUEST_TYPES[key].description}</div>
                </button>
              ))}
            </div>
          ) : awaitingTargetPick ? (
            <div className="space-y-2">
              <p className="text-sm mb-1" style={{ color: COLORS.muted }}>¿A qué fabricante os acercáis primero? Cada uno os juzgará por vuestros propios méritos — {team.manufacturer} no tiene voz aquí.</p>
              {(() => {
                const candidates = otherManufacturerCandidates(team.manufacturer, allMotoGpTeams, motogpSeatTiers);
                if (!candidates.length) {
                  return <p className="text-xs italic" style={{ color: COLORS.muted }}>Ninguna otra marca tiene sitio libre para un tercer equipo ahora mismo — todas ya tienen dos equipos satélite propios.</p>;
                }
                return candidates.map((mfr) => (
                  <button key={mfr} onClick={() => setTargetManufacturer(mfr)}
                    className="w-full flex items-center gap-3 text-left rounded-xl p-3" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
                    <ManufacturerLogo name={mfr} accent={accent} size={36} />
                    <span className="text-sm font-bold" style={{ color: COLORS.text }}>{mfr}</span>
                  </button>
                ));
              })()}
            </div>
          ) : (
            <>
              <div className="rounded-xl p-3" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                <div className="text-sm font-bold" style={{ color: COLORS.text }}>{isSwitch ? `Fichar por ${targetManufacturer}` : MANUFACTURER_REQUEST_TYPES[requestType].label}</div>
                <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{isSwitch ? `Convencer a ${targetManufacturer} de que os acepte como su nuevo equipo cliente.` : MANUFACTURER_REQUEST_TYPES[requestType].description}</div>
              </div>

              {isSwitch && liveOffer && (
                <div>
                  <div className="text-xs mb-1.5" style={{ color: COLORS.muted }}>Lo que {targetManufacturer} os ofrece para vuestros dos pilotos:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {liveOffer.map((tier, i) => (
                      <div key={i} className="rounded-lg px-3 py-2 text-center" style={{ background: `${accent}18`, border: `1px solid ${accent}55` }}>
                        <span className="text-sm font-bold" style={{ color: accent }}>{MOTOGP_BIKE_TIER_LABELS[tier]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: COLORS.muted }}>
                  <span>Frío</span>
                  <span style={{ color: zoneColor, fontWeight: 700 }}>{ZONE_LABEL[reaction?.zone || liveZone]}</span>
                  <span>Favorable</span>
                </div>
                <div className="h-3 rounded-full w-full relative overflow-hidden" style={{ background: COLORS.panel2 }}>
                  <div className="absolute inset-y-0 left-0" style={{ width: "100%", background: `linear-gradient(90deg, ${COLORS.danger}, ${COLORS.gold}, ${COLORS.success})`, opacity: 0.3 }} />
                  <div className="absolute top-1/2 h-4 w-1.5 rounded-full transition-all duration-300" style={{ left: `${pct}%`, transform: "translate(-50%,-50%)", background: zoneColor, boxShadow: `0 0 8px ${zoneColor}` }} />
                </div>
              </div>

              <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
                <MessageCircle size={17} style={{ color: zoneColor, flexShrink: 0, marginTop: 2 }} />
                <p className="text-sm leading-relaxed" style={{ color: COLORS.text }}>
                  {reaction ? reaction.line : "Plantea la petición y veamos qué responde la fábrica."}
                </p>
              </div>

              {reaction && (
                <div className="text-xs" style={{ color: COLORS.muted }}>
                  {reaction.outcome
                    ? (isSwitch ? `${targetManufacturer} os acepta como su nuevo equipo cliente — el cambio se hará efectivo la próxima temporada.` : "Petición concedida.")
                    : "No han accedido esta vez — podéis volver a intentarlo más adelante, si la situación cambia."}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 flex-shrink-0" style={{ borderTop: `1px solid ${COLORS.rule}` }}>
          {!requestType ? (
            <button onClick={handleClose} className="w-full py-3 rounded-lg font-bold" style={{ background: COLORS.panel2, color: COLORS.text }}>
              Cerrar
            </button>
          ) : reaction ? (
            <button onClick={handleClose} className="w-full py-3 rounded-lg font-bold" style={{ background: COLORS.gold, color: COLORS.bg }}>
              Cerrar
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleBack} className="px-4 py-3 rounded-lg font-semibold" style={{ background: COLORS.panel2, color: COLORS.text }}>
                Atrás
              </button>
              {!awaitingTargetPick && (
                <button onClick={handleSend} className="flex-1 py-3 rounded-lg font-bold" style={{ background: COLORS.gold, color: COLORS.bg }}>
                  Plantear la petición
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function clampPct(v) { return Math.max(2, Math.min(98, v)); }
