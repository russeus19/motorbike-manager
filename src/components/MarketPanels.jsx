import { useEffect, useState } from "react";
import { Newspaper, Handshake } from "lucide-react";
import { Panel } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { CATEGORY_DATA } from "../data/categories.js";
import { groupNegotiationsByStatus } from "../utils/marketNegotiations.js";

/**
 * Rumores — an automatic slider cycling through the market's rumor feed
 * (utils/marketNegotiations.js). Purely a reader over `marketRumors`;
 * generating rumors happens once per race in App.jsx's runRace, not here.
 */
export function RumorsPanel({ marketRumors, accent }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!marketRumors.length) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % marketRumors.length), 4500);
    return () => clearInterval(id);
  }, [marketRumors.length]);

  useEffect(() => { setIndex(0); }, [marketRumors.length > 0 ? marketRumors[0].id : null]);

  const current = marketRumors[index % Math.max(1, marketRumors.length)];

  return (
    <Panel title="Rumores" icon={Newspaper} accent={accent}>
      {!marketRumors.length ? (
        <p className="text-sm" style={{ color: COLORS.muted }}>Todavía no hay rumores de mercado. Volvé a mirar tras disputar algún Gran Premio más.</p>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate" style={{ color: COLORS.text }}>{current.text}</p>
            <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{CATEGORY_DATA[current.categoryKey]?.label}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {marketRumors.slice(0, 8).map((r, i) => (
              <span key={r.id} className="rounded-full" style={{ width: 5, height: 5, background: i === (index % Math.max(1, marketRumors.length)) ? accent : COLORS.rule }} />
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

const STATUS_LABEL = { pendientes: "Pendientes", aceptadas: "Aceptadas", rechazadas: "Rechazadas", finalizadas: "Finalizadas" };
const STATUS_ORDER = ["pendientes", "aceptadas", "rechazadas", "finalizadas"];

function negotiationHeadline(neg) {
  if (neg.status === "confirmed") return `${neg.riderName} firmará por ${neg.toTeamName} la próxima temporada.`;
  if (neg.status === "failed") return `Negociación por ${neg.riderName} finalizada sin acuerdo.`;
  if (neg.status === "team_countered") return `${neg.fromTeamName} ha hecho una contraoferta por ${neg.riderName}.`;
  if (neg.status === "rider_countered") return `${neg.riderName} pide mejores condiciones.`;
  if (neg.status === "pending_team") return `Esperando respuesta de ${neg.fromTeamName} por ${neg.riderName}.`;
  return `Negociando el contrato de ${neg.riderName}.`;
}

/**
 * Ofertas — every negotiation the player is currently involved in,
 * grouped by status, plus a separate section for unsolicited offers a
 * rival has made for one of the player's own riders (section 14) —
 * those need an explicit accept/reject from the player before they can
 * proceed to asking the rider themselves.
 */
export function OffersPanel({ marketNegotiations, accent, onRespondToIncomingOffer }) {
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
                      <button onClick={() => onRespondToIncomingOffer(neg.id, true)}
                        className="flex-1 py-1 rounded text-xs font-semibold" style={{ background: "#3F9142", color: "#fff" }}>
                        Aceptar
                      </button>
                      <button onClick={() => onRespondToIncomingOffer(neg.id, false)}
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
                {groups[key].map((neg) => (
                  <div key={neg.id} className="rounded-md px-3 py-2 text-sm" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                    <div>{negotiationHeadline(neg)}</div>
                    {neg.teamOfferAmount != null && (
                      <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>Compensación ofrecida: €{Math.round(neg.teamOfferAmount).toLocaleString()}</div>
                    )}
                    {neg.riderTerms && (
                      <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>Contrato ofrecido: €{Math.round(neg.riderTerms.salary).toLocaleString()}/año · {neg.riderTerms.years} año{neg.riderTerms.years === 1 ? "" : "s"}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
