import { useMemo, useState } from "react";
import { ArrowRight, MessageCircle, X } from "lucide-react";
import { TeamLogo } from "./TeamLogo.jsx";
import { COLORS } from "../data/colors.js";
import { computeTeamAcceptScore } from "../utils/marketAI.js";
import { pickTeamNegotiationLine, thermometerZone } from "../utils/negotiationDialogue.js";
import { computeMarketValue } from "../utils/riders.js";
import { teamDisplayName } from "../utils/teamNaming.js";

const ZONE_COLOR = { frio: COLORS.danger, dudoso: COLORS.gold, favorable: COLORS.success };
const ZONE_LABEL = { frio: "Frío", dudoso: "Dudoso", favorable: "Favorable" };

/**
 * The preliminary step for signing someone with more than a year left
 * on their contract: negotiating the release fee with their CURRENT
 * team, not with the rider themselves yet. Deliberately built as the
 * same screen shape as NegotiationScreen (team logo instead of a rider
 * photo, same thermometer, same dialogue-bubble pattern) so it reads
 * as one more step of the same conversation, not a different tool.
 *
 * onSendOffer(offerAmount) => "favorable" | "dudoso" | "frio"
 * onClauseRelease() — pay the unilateral release clause outright,
 *   skipping the team's decision entirely.
 * onClose(outcome) — "favorable" auto-advances the parent straight into
 *   the rider negotiation; anything else just closes this screen.
 */
export function TeamNegotiationScreen({ rider, categoryKey, sellingTeam, playerTeam, scale, onSendOffer, onClauseRelease, onClose }) {
  const marketValue = computeMarketValue(rider, scale || 1);
  const clauseAmount = Math.round(marketValue * 1.5);

  const [offerAmount, setOfferAmount] = useState(Math.round(marketValue * 1.1));
  const [usedLines, setUsedLines] = useState([]);
  const [reaction, setReaction] = useState(null);
  const [ended, setEnded] = useState(false);

  const liveScore = useMemo(() => computeTeamAcceptScore(rider, sellingTeam, offerAmount, scale || 1), [rider, sellingTeam, offerAmount, scale]);
  const liveZone = thermometerZone(liveScore);

  function handleSend() {
    if (ended) return;
    const outcome = onSendOffer(offerAmount);
    const line = pickTeamNegotiationLine(outcome, usedLines);
    setUsedLines((prev) => [...prev.slice(-3), line]);
    setReaction({ zone: outcome, line });
    setEnded(true);
  }

  function handleClose() {
    onClose(reaction?.zone || null);
  }

  const zoneColor = ZONE_COLOR[reaction?.zone || liveZone];
  const needlePct = Math.round(((reaction ? (reaction.zone === "favorable" ? 0.95 : reaction.zone === "frio" ? 0.05 : 0.5) : liveScore) - 0.03) / (0.95 - 0.03) * 100);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: "rgba(0,0,0,0.65)" }} onClick={handleClose}>
      <div className="w-full max-w-lg rounded-2xl border flex flex-col" style={{ background: COLORS.bg, borderColor: COLORS.rule, maxHeight: "85vh", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }} onClick={(e) => e.stopPropagation()}>
        <div className="relative flex items-center gap-4 p-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
          <button onClick={handleClose} className="absolute right-4 top-5" aria-label="Cerrar conversación">
            <X size={20} style={{ color: COLORS.muted }} />
          </button>
          <TeamLogo team={sellingTeam} size={60} />
          <div className="min-w-0">
            <div className="text-lg font-bold leading-tight" style={{ color: COLORS.text, fontFamily: "Rajdhani, sans-serif" }}>{teamDisplayName(sellingTeam)}</div>
            <div className="flex items-center gap-1.5 mt-1 text-sm" style={{ color: COLORS.muted }}>
              Negociando la salida de {rider.name}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: COLORS.gold }}>
              Destino: {teamDisplayName(playerTeam)} <ArrowRight size={11} />
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
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
              {reaction ? reaction.line : "Plantea la compensación y veamos qué opina el equipo."}
            </p>
          </div>

          {ended && (
            <div className="text-xs" style={{ color: COLORS.muted }}>
              {reaction?.zone === "favorable" ? "Podéis negociar ya el fichaje directamente con el piloto."
                : reaction?.zone === "dudoso" ? "El equipo se lo pensará — responderá en el próximo Gran Premio."
                : "El equipo ha rechazado la oferta."}
            </div>
          )}

          <div className="rounded-xl p-3 text-xs" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
            <div className="uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>Valor de mercado de {rider.name}</div>
            <div style={{ color: COLORS.text }}>€{Math.round(marketValue).toLocaleString()}</div>
          </div>

          <label className="flex flex-col gap-1 text-xs" style={{ color: COLORS.muted }}>Compensación ofrecida (€)
            <input type="number" value={offerAmount} disabled={ended} onChange={(e) => setOfferAmount(Number(e.target.value))}
              className="px-2 py-1.5 rounded-lg font-mono" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
          </label>

          {!ended && (
            <button onClick={onClauseRelease} className="w-full py-2.5 rounded-lg text-sm font-semibold" style={{ background: `${COLORS.gold}18`, color: COLORS.gold, border: `1px solid ${COLORS.gold}` }}>
              Pagar cláusula de rescisión unilateral — €{clauseAmount.toLocaleString()}
            </button>
          )}
        </div>

        <div className="p-4 flex-shrink-0" style={{ borderTop: `1px solid ${COLORS.rule}` }}>
          {ended ? (
            <button onClick={handleClose} className="w-full py-3 rounded-lg font-bold" style={{ background: COLORS.gold, color: COLORS.bg }}>
              {reaction?.zone === "favorable" ? "Negociar con el piloto" : "Cerrar"}
            </button>
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
