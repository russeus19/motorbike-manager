import { useEffect, useRef, useState } from "react";
import { Newspaper, Handshake } from "lucide-react";
import { Panel } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { CATEGORY_DATA } from "../data/categories.js";
import { groupNegotiationsByStatus } from "../utils/marketNegotiations.js";
import { buildNewsEntities, linkifyNewsText } from "../utils/newsLinkify.js";

const AUTO_ADVANCE_MS = 4500;
const PAUSE_AFTER_INTERACTION_MS = 6000;
const SWIPE_THRESHOLD_PX = 40;

/** Renders one rumor's text with any rider/team name inside it turned
 * into a clickable, subtly-styled span — auto-detected via
 * utils/newsLinkify.js, never manually tagged per rumor. */
function LinkifiedText({ text, entities, onOpenRiderProfileById, onOpenTeamProfileById }) {
  const segments = linkifyNewsText(text, entities);
  return (
    <p className="text-sm truncate" style={{ color: COLORS.text }}>
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.value}</span>;
        const isRider = seg.type === "rider";
        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              if (isRider) onOpenRiderProfileById?.(seg.riderId, seg.categoryKey);
              else onOpenTeamProfileById?.(seg.teamId, seg.categoryKey);
            }}
            className="font-semibold underline decoration-dotted hover:opacity-75 active:opacity-60"
            style={{ color: COLORS.gold }}>
            {seg.value}
          </button>
        );
      })}
    </p>
  );
}

/**
 * Rumores — an automatic slider cycling through the market's rumor feed
 * (utils/marketNegotiations.js), with clickable page indicators, manual
 * swipe/drag navigation (auto-advance pauses briefly after either), and
 * every rider/team name inside the text turned into a clickable link to
 * that rider's or team's profile. Purely a reader over `marketRumors`;
 * generating rumors happens once per race in App.jsx's runRace, not here.
 */
export function RumorsPanel({ marketRumors, accent, playerTeam, rivalTeams, otherCategories, freeAgents, category, onOpenRiderProfileById, onOpenTeamProfileById }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pauseTimerRef = useRef(null);
  const dragStartXRef = useRef(null);

  const entities = buildNewsEntities({ playerTeam, rivalTeams, otherCategories, freeAgents, category });

  useEffect(() => {
    if (!marketRumors.length || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % marketRumors.length), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [marketRumors.length, paused]);

  useEffect(() => { setIndex(0); }, [marketRumors.length > 0 ? marketRumors[0].id : null]);

  useEffect(() => () => { if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current); }, []);

  function pauseAutoAdvanceBriefly() {
    setPaused(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => setPaused(false), PAUSE_AFTER_INTERACTION_MS);
  }

  function goTo(i) {
    setIndex(((i % marketRumors.length) + marketRumors.length) % marketRumors.length);
    pauseAutoAdvanceBriefly();
  }

  function handleTouchStart(e) { dragStartXRef.current = e.touches[0].clientX; }
  function handleTouchEnd(e) {
    if (dragStartXRef.current == null) return;
    const delta = e.changedTouches[0].clientX - dragStartXRef.current;
    dragStartXRef.current = null;
    if (delta <= -SWIPE_THRESHOLD_PX) goTo(index + 1);
    else if (delta >= SWIPE_THRESHOLD_PX) goTo(index - 1);
  }

  const current = marketRumors[index % Math.max(1, marketRumors.length)];

  return (
    <Panel title="Rumores" icon={Newspaper} accent={accent}>
      {!marketRumors.length ? (
        <p className="text-sm" style={{ color: COLORS.muted }}>Todavía no hay rumores de mercado. Volvé a mirar tras disputar algún Gran Premio más.</p>
      ) : (
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div className="flex items-center gap-3">
            <button onClick={() => goTo(index - 1)} className="flex-shrink-0 text-lg leading-none px-1" style={{ color: COLORS.muted }} aria-label="Rumor anterior">‹</button>
            <div className="flex-1 min-w-0">
              <LinkifiedText text={current.text} entities={entities} onOpenRiderProfileById={onOpenRiderProfileById} onOpenTeamProfileById={onOpenTeamProfileById} />
              <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{CATEGORY_DATA[current.categoryKey]?.label}</p>
            </div>
            <button onClick={() => goTo(index + 1)} className="flex-shrink-0 text-lg leading-none px-1" style={{ color: COLORS.muted }} aria-label="Rumor siguiente">›</button>
          </div>
          <div className="flex justify-center gap-1.5 mt-2">
            {marketRumors.slice(0, 12).map((r, i) => (
              <button key={r.id} onClick={() => goTo(i)} aria-label={`Ir al rumor ${i + 1}`}
                className="rounded-full" style={{ width: 6, height: 6, background: i === (index % Math.max(1, marketRumors.length)) ? accent : COLORS.rule }} />
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

const STATUS_LABEL = { contraofertas: "Contraofertas recibidas", pendientes: "Pendientes", aceptadas: "Aceptadas", rechazadas: "Rechazadas", retiradas: "Retiradas", finalizadas: "Finalizadas" };
const STATUS_ORDER = ["contraofertas", "pendientes", "aceptadas", "rechazadas", "retiradas", "finalizadas"];
const CLICKABLE_STATUSES = ["contraofertas", "pendientes", "aceptadas"];

function negotiationHeadline(neg) {
  if (neg.status === "applied") return `${neg.riderName} renovó su contrato con ${neg.toTeamName}.`;
  if (neg.status === "confirmed") return `${neg.riderName} firmará por ${neg.toTeamName} la próxima temporada.`;
  if (neg.status === "failed") return `Negociación por ${neg.riderName} finalizada sin acuerdo.`;
  if (neg.status === "withdrawn") return `Retiraste la negociación por ${neg.riderName}.`;
  if (neg.status === "team_countered") return `${neg.fromTeamName} presenta una contraoferta por ${neg.riderName}.`;
  if (neg.status === "rider_countered") return `${neg.riderName} pide mejores condiciones.`;
  if (neg.status === "pending_team") return `Esperando respuesta de ${neg.fromTeamName} por ${neg.riderName}.`;
  return `Negociando el contrato de ${neg.riderName}.`;
}

function lastCounterRound(neg) {
  const h = neg.history || [];
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i].actor !== "player") return h[i].round;
  }
  return neg.createdRound;
}

/**
 * Ofertas — every negotiation the player is currently involved in,
 * grouped by status, plus a separate section for unsolicited offers a
 * rival has made for one of the player's own riders (section 14) —
 * those need an explicit accept/reject from the player before they can
 * proceed to asking the rider themselves. Contraofertas and other still-
 * live negotiations are clickable — they reopen the exact same rider
 * profile/offer screen the original offer was made from, fully loaded
 * with everything agreed so far.
 */
export function OffersPanel({ marketNegotiations, accent, onRespondToIncomingOffer, onOpenNegotiation }) {
  const groups = groupNegotiationsByStatus(marketNegotiations);
  const incoming = (marketNegotiations || []).filter((n) => n.fromTeamId === "player" && n.status === "pending_team");
  const isEmpty = STATUS_ORDER.every((key) => groups[key].length === 0) && incoming.length === 0;

  return (
    <Panel title="Ofertas" icon={Handshake} accent={accent}>
      {isEmpty ? (
        <p className="text-sm" style={{ color: COLORS.muted }}>No tenés ninguna negociación en marcha.</p>
      ) : (
        <div className="space-y-3">
          {incoming.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: COLORS.muted }}>Ofertas recibidas</div>
              <div className="space-y-1.5">
                {incoming.map((neg) => (
                  <div key={neg.id} className="rounded-md px-3 py-2 text-sm" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                    <div>{neg.toTeamName} ofrece €{Math.round(neg.teamOfferAmount).toLocaleString()} por {neg.riderName}.</div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => onRespondToIncomingOffer(neg.id, "accept")}
                        className="flex-1 py-1 rounded text-xs font-semibold" style={{ background: "#3F9142", color: "#fff" }}>
                        Aceptar
                      </button>
                      <button onClick={() => onRespondToIncomingOffer(neg.id, "counter", Math.round(neg.teamOfferAmount * 1.25))}
                        className="flex-1 py-1 rounded text-xs font-semibold" style={{ background: "#E08E45", color: "#12151A" }}>
                        Contraofertar
                      </button>
                      <button onClick={() => onRespondToIncomingOffer(neg.id, "reject")}
                        className="flex-1 py-1 rounded text-xs font-semibold" style={{ background: COLORS.panel, color: COLORS.muted }}>
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {STATUS_ORDER.filter((key) => groups[key].length > 0).map((key) => (
            <div key={key}>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: COLORS.muted }}>{STATUS_LABEL[key]}</div>
              <div className="space-y-1.5">
                {groups[key].map((neg) => {
                  const clickable = CLICKABLE_STATUSES.includes(key) && onOpenNegotiation;
                  const Wrapper = clickable ? "button" : "div";
                  return (
                    <Wrapper key={neg.id} onClick={clickable ? () => onOpenNegotiation(neg) : undefined}
                      className={`w-full text-left rounded-md px-3 py-2 text-sm ${clickable ? "hover:opacity-80" : ""}`}
                      style={{ background: COLORS.panel2, border: `1px solid ${key === "contraofertas" ? accent : COLORS.rule}` }}>
                      <div>{negotiationHeadline(neg)}</div>
                      {key === "contraofertas" && <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>Recibida en la ronda {lastCounterRound(neg) + 1}</div>}
                      {neg.teamOfferAmount != null && (
                        <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>Compensación ofrecida: €{Math.round(neg.teamOfferAmount).toLocaleString()}</div>
                      )}
                      {neg.riderTerms && (
                        <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>Contrato ofrecido: €{Math.round(neg.riderTerms.salary).toLocaleString()}/año · {neg.riderTerms.years} año{neg.riderTerms.years === 1 ? "" : "s"}</div>
                      )}
                      {clickable && <div className="text-xs mt-1" style={{ color: accent }}>Ver negociación →</div>}
                    </Wrapper>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
