import { useEffect, useRef, useState } from "react";
import { Newspaper, Handshake, Wallet, Users, Target, TrendingUp, Check, X, MessageSquareText } from "lucide-react";
import { Panel } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { CATEGORY_DATA } from "../data/categories.js";
import { groupNegotiationsByStatus } from "../utils/marketNegotiations.js";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { TeamLogo } from "./TeamLogo.jsx";
import { CountryFlag } from "./CountryFlag.jsx";

const CATEGORY_ORDER_FOR_RUMORS = ["motogp", "moto2", "moto3", "superbikes", "supersport", "sportbike", "worldwcr"];

const RUMOR_KIND_LABEL = {
  interest: "Interés", renewal: "Renovación", departure: "Posible salida",
  interest_multiple: "Interés", free_agent_interest: "Agente libre", free_agent_search: "Agente libre",
};

/** A small circular progress ring showing a rumor's probability —
 * the same idea a real transfer-market rumor tracker always uses
 * (a percentage is far easier to scan at a glance across a whole list
 * than reading each one's exact wording), built as a plain inline SVG
 * so it costs nothing extra to render dozens of these in one screen. */
function ProbabilityRing({ value, accent, size = 44 }) {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 60 ? "#3F9142" : value >= 35 ? COLORS.gold : COLORS.muted;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.rule} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c - (c * clamp01(value)) / 100} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold" style={{ color: COLORS.text, fontFamily: "Rajdhani, sans-serif" }}>{Math.round(value)}%</span>
      </div>
    </div>
  );
}
function clamp01(v) { return Math.max(0, Math.min(100, v)); }

/** A team's logo, or a muted "?" placeholder when the rumor genuinely
 * doesn't name one (a free agent's origin, or a "podría abandonar"
 * rumor with no known destination yet) — never invents a team the
 * rumor itself didn't specify. */
function RumorTeamMark({ teamId, teamName, logoId, onOpenTeamProfileById, categoryKey }) {
  if (!teamId) {
    return (
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: COLORS.panel, border: `1px dashed ${COLORS.rule}` }}>
        <span className="text-sm font-bold" style={{ color: COLORS.muted }}>?</span>
      </div>
    );
  }
  return (
    <button onClick={(e) => { e.stopPropagation(); onOpenTeamProfileById?.(teamId, categoryKey); }} title={teamName} className="flex-shrink-0">
      <TeamLogo logoId={logoId} size={36} className="rounded-lg" />
    </button>
  );
}

/** One rumor, as a rich card: rider photo + flag + name up front, an
 * origin → destination team pairing (each a real logo or a "?"
 * placeholder), and a probability ring — the same information the old
 * one-sentence-at-a-time slider gave, just legible at a glance and
 * several at once instead of one full text block taking the whole
 * panel. */
function RumorCard({ rumor, accent, onOpenRiderProfileById, onOpenTeamProfileById }) {
  return (
    <button
      onClick={() => onOpenRiderProfileById?.(rumor.riderId, rumor.categoryKey)}
      className="w-full text-left rounded-xl p-2.5 flex flex-col items-center gap-1.5" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
      <RiderPhoto riderId={rumor.riderPhotoId} size={40} className="rounded-lg" />
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm font-bold truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{rumor.riderName}</span>
        {rumor.riderNat && <CountryFlag nat={rumor.riderNat} width={14} className="flex-shrink-0" />}
      </div>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: COLORS.muted }}>{RUMOR_KIND_LABEL[rumor.kind] || "Rumor"}</div>
      <div className="flex items-center gap-1.5">
        <RumorTeamMark teamId={rumor.fromTeamId} teamName={rumor.fromTeamName} logoId={rumor.fromTeamLogoId} onOpenTeamProfileById={onOpenTeamProfileById} categoryKey={rumor.categoryKey} />
        <span style={{ color: COLORS.muted }}>→</span>
        <RumorTeamMark teamId={rumor.toTeamId} teamName={rumor.toTeamName} logoId={rumor.toTeamLogoId} onOpenTeamProfileById={onOpenTeamProfileById} categoryKey={rumor.categoryKey} />
      </div>
      <ProbabilityRing value={rumor.probability} accent={accent} size={38} />
    </button>
  );
}

const AUTO_ADVANCE_MS = 6000;
const PAUSE_AFTER_INTERACTION_MS = 7000;
const SWIPE_THRESHOLD_PX = 40;
const RUMORS_PER_PAGE = 6;

/**
 * Rumores — redesigned from a one-sentence-at-a-time text slider into
 * a page-per-category slider: each swipe/dot moves to a DIFFERENT
 * category (MotoGP, Moto2, Moto3, WorldSBK...) instead of a different
 * individual rumor, and each page shows several of that category's
 * most recent rumors at once as rich cards (rider photo/flag, origin
 * → destination team logos, a probability ring) — closer to how a
 * real transfer-market rumor tracker actually reads, and far more
 * legible than the old plain-text version.
 */
export function RumorsPanel({ marketRumors, accent, category, onOpenRiderProfileById, onOpenTeamProfileById }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pauseTimerRef = useRef(null);
  const dragStartXRef = useRef(null);

  const byCategory = {};
  (marketRumors || []).forEach((r) => { (byCategory[r.categoryKey] ||= []).push(r); });
  const pages = CATEGORY_ORDER_FOR_RUMORS
    .filter((k) => byCategory[k]?.length)
    .map((k) => ({ categoryKey: k, rumors: byCategory[k].slice(0, RUMORS_PER_PAGE) }));
  // The player's own current category leads the slider — the most
  // relevant page is the one they'd otherwise have to swipe furthest
  // to reach.
  pages.sort((a, b) => (a.categoryKey === category ? -1 : b.categoryKey === category ? 1 : 0));

  useEffect(() => {
    if (pages.length < 2 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % pages.length), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [pages.length, paused]);

  useEffect(() => { setIndex(0); }, [marketRumors?.length ? marketRumors[0].id : null]);

  useEffect(() => () => { if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current); }, []);

  function pauseAutoAdvanceBriefly() {
    setPaused(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => setPaused(false), PAUSE_AFTER_INTERACTION_MS);
  }

  function goTo(i) {
    setIndex(((i % pages.length) + pages.length) % pages.length);
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

  const currentPage = pages[index % Math.max(1, pages.length)];

  return (
    <Panel title="Rumores" icon={Newspaper} accent={accent}>
      {!pages.length ? (
        <p className="text-sm" style={{ color: COLORS.muted }}>Todavía no hay rumores de mercado. Volvé a mirar tras disputar algún Gran Premio más.</p>
      ) : (
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => goTo(index - 1)} className="flex-shrink-0 text-lg leading-none px-1" style={{ color: COLORS.muted }} aria-label="Categoría anterior">‹</button>
            <div className="flex-1 text-center text-sm font-bold uppercase tracking-wide" style={{ color: accent, fontFamily: "Rajdhani, sans-serif" }}>
              {CATEGORY_DATA[currentPage.categoryKey]?.label}
            </div>
            <button onClick={() => goTo(index + 1)} className="flex-shrink-0 text-lg leading-none px-1" style={{ color: COLORS.muted }} aria-label="Categoría siguiente">›</button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
            {currentPage.rumors.map((r) => (
              <RumorCard key={r.id} rumor={r} accent={accent} onOpenRiderProfileById={onOpenRiderProfileById} onOpenTeamProfileById={onOpenTeamProfileById} />
            ))}
          </div>

          <div className="flex justify-center gap-1.5 mt-2.5">
            {pages.map((p, i) => (
              <button key={p.categoryKey} onClick={() => goTo(i)} aria-label={`Ir a ${CATEGORY_DATA[p.categoryKey]?.label}`}
                className="rounded-full" style={{ width: 6, height: 6, background: i === (index % pages.length) ? accent : COLORS.rule }} />
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

const STATUS_META = {
  contraofertas: { label: "Contraofertas", color: COLORS.gold },
  pendientes: { label: "Pendientes", color: "#6C8FE0" },
  aceptadas: { label: "Aceptadas", color: "#3F9142" },
  rechazadas: { label: "Rechazadas", color: COLORS.danger },
  retiradas: { label: "Retiradas", color: COLORS.muted },
  finalizadas: { label: "Finalizadas", color: "#3F9142" },
};
const STATUS_ORDER = ["contraofertas", "pendientes", "aceptadas", "rechazadas", "retiradas", "finalizadas"];
const ACTIVE_STATUS_ORDER = ["contraofertas", "pendientes"];
const HISTORY_STATUS_ORDER = ["aceptadas", "rechazadas", "retiradas", "finalizadas"];
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

/** Flat id -> rider/team lookup across every roster the panel might
 * need to reach into (the player's own team, every rival in the
 * currently played category, every team in every background category,
 * and the free-agent pool) — a negotiation only ever carries riderId/
 * fromTeamId/toTeamId, never the full objects, so this is what lets a
 * card show a rider's flag or a team's real logo instead of a bare
 * name. Built once per render from whatever the caller already has in
 * scope; cheap enough for this panel's realistic list sizes. */
function buildMarketLookups({ playerTeam, rivalTeams, otherCategories, freeAgents }) {
  const teamsById = new Map();
  const ridersById = new Map();
  const addTeam = (t) => { if (t?.id) teamsById.set(t.id, t); (t?.riders || []).forEach((r) => r?.id && ridersById.set(r.id, r)); };
  addTeam(playerTeam);
  (rivalTeams || []).forEach(addTeam);
  Object.values(otherCategories || {}).forEach((cat) => (cat?.teams || []).forEach(addTeam));
  (freeAgents || []).forEach((r) => r?.id && ridersById.set(r.id, r));
  return { teamsById, ridersById };
}

/** A small "€ / año · N años" line shared by every card style below —
 * the one piece of information every offer/negotiation card needs to
 * show no matter which section it's in. */
function TermsLine({ salary, years, accent }) {
  if (salary == null) return null;
  return (
    <span style={{ color: COLORS.muted }}>
      <span style={{ color: accent, fontWeight: 700 }}>€{Math.round(salary).toLocaleString()}</span>/año · {years} año{years === 1 ? "" : "s"}
    </span>
  );
}

/** One received, unsolicited offer from a rival team for one of the
 * player's own riders — the single most important, actionable card in
 * the whole panel, so it gets the richest treatment: the offering
 * team's real logo, the rider's own photo and flag, the headline
 * economic figure large and immediate, and all three responses
 * available without leaving the card. */
function IncomingOfferCard({ neg, accent, lookups, onRespondToIncomingOffer }) {
  const team = lookups.teamsById.get(neg.toTeamId);
  const rider = lookups.ridersById.get(neg.riderId);
  const categoryLabel = CATEGORY_DATA[neg.categoryKey]?.label;
  return (
    <div className="rounded-xl p-3" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
      <div className="flex items-start gap-3">
        <TeamLogo team={team} logoId={team?.logoId} size={40} className="rounded flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{neg.toTeamName}</div>
          {categoryLabel && <div className="text-[10px] uppercase tracking-wide" style={{ color: COLORS.muted }}>{categoryLabel}</div>}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] uppercase tracking-wide" style={{ color: COLORS.muted }}>Oferta</div>
          <div className="text-base font-bold leading-none" style={{ fontFamily: "Rajdhani, sans-serif", color: accent }}>€{Math.round(neg.teamOfferAmount).toLocaleString()}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.rule}` }}>
        <RiderPhoto riderId={neg.riderPhotoId} size={36} className="rounded-md flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {rider?.nat && <CountryFlag nat={rider.nat} width={14} />}
            <span className="text-sm font-semibold truncate" style={{ color: COLORS.text }}>{neg.riderName}</span>
          </div>
          <div className="text-xs"><TermsLine salary={neg.riderTerms?.salary} years={neg.riderTerms?.years} accent={accent} /></div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={() => onRespondToIncomingOffer(neg.id, "accept")}
          className="flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1" style={{ background: "#3F9142", color: "#fff" }}>
          <Check size={13} /> Aceptar
        </button>
        <button onClick={() => onRespondToIncomingOffer(neg.id, "counter", Math.round(neg.teamOfferAmount * 1.25))}
          className="flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1" style={{ background: "#E08E45", color: "#12151A" }}>
          <MessageSquareText size={13} /> Contraofertar
        </button>
        <button onClick={() => onRespondToIncomingOffer(neg.id, "reject")}
          className="flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1" style={{ background: COLORS.panel, color: COLORS.muted, border: `1px solid ${COLORS.rule}` }}>
          <X size={13} /> Rechazar
        </button>
      </div>
    </div>
  );
}

/** Every other negotiation the player is a part of — a contraoferta
 * needing a response, one still pending, or (collapsed by default)
 * the resolved history. Lighter than IncomingOfferCard since these
 * aren't all immediately actionable, but still shows the counterpart
 * team's logo and the rider's photo/flag rather than the old plain
 * text row. */
function NegotiationCard({ neg, accent, lookups, statusKey, onOpenNegotiation }) {
  const otherTeamId = neg.fromTeamId === "player" ? neg.toTeamId : neg.fromTeamId;
  const otherTeamName = neg.fromTeamId === "player" ? neg.toTeamName : neg.fromTeamName;
  const team = lookups.teamsById.get(otherTeamId);
  const rider = lookups.ridersById.get(neg.riderId);
  const meta = STATUS_META[statusKey];
  const clickable = CLICKABLE_STATUSES.includes(statusKey) && onOpenNegotiation;
  const Wrapper = clickable ? "button" : "div";
  return (
    <Wrapper onClick={clickable ? () => onOpenNegotiation(neg) : undefined}
      className={`w-full text-left rounded-lg p-2.5 flex items-center gap-2.5 ${clickable ? "hover:opacity-80" : ""}`}
      style={{ background: COLORS.panel2, border: `1px solid ${statusKey === "contraofertas" ? accent : COLORS.rule}` }}>
      <TeamLogo team={team} logoId={team?.logoId} size={30} className="rounded flex-shrink-0" />
      <RiderPhoto riderId={neg.riderPhotoId} size={30} className="rounded-md flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {rider?.nat && <CountryFlag nat={rider.nat} width={12} />}
          <span className="text-xs font-semibold truncate" style={{ color: COLORS.text }}>{negotiationHeadline(neg)}</span>
        </div>
        <div className="text-[11px] mt-0.5 flex items-center gap-2 flex-wrap">
          {neg.teamOfferAmount != null && <span style={{ color: COLORS.muted }}>Compensación: <span style={{ color: accent, fontWeight: 700 }}>€{Math.round(neg.teamOfferAmount).toLocaleString()}</span></span>}
          {neg.riderTerms && <TermsLine salary={neg.riderTerms.salary} years={neg.riderTerms.years} accent={accent} />}
          {statusKey === "contraofertas" && <span style={{ color: COLORS.muted }}>· Ronda {lastCounterRound(neg) + 1}</span>}
        </div>
      </div>
      <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: `${meta.color}22`, color: meta.color }}>{meta.label}</span>
    </Wrapper>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-lg px-3 py-2 flex items-center gap-2.5" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
      <Icon size={16} style={{ color: accent }} className="flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide truncate" style={{ color: COLORS.muted }}>{label}</div>
        <div className="text-sm font-bold truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{value}</div>
      </div>
    </div>
  );
}

/**
 * Mercado de fichajes (formerly "Ofertas") — every negotiation the
 * player is currently involved in, redesigned around the same idea a
 * proper transfer-market screen always has: the offers that actually
 * need a decision (received, unsolicited offers for the player's own
 * riders; contraofertas awaiting a response) get full, rich cards
 * with real team logos and rider photos right up top; everything else
 * (still-pending, and the resolved history) sits below, lighter and
 * out of the way but still one tap from reopening.
 *
 * A short stats strip up top (budget, current salary spend, roster
 * size, team objective) gives the same "how am I actually placed
 * right now" context a real transfer-market hub opens with, using
 * only data this save already tracks — no invented salary cap or
 * scouting network, just what's real here.
 */
export function OffersPanel({ marketNegotiations, accent, onRespondToIncomingOffer, onOpenNegotiation, playerTeam, rivalTeams, otherCategories, freeAgents, budget }) {
  const groups = groupNegotiationsByStatus(marketNegotiations);
  const incoming = (marketNegotiations || []).filter((n) => n.fromTeamId === "player" && n.status === "pending_team");
  const isEmpty = STATUS_ORDER.every((key) => groups[key].length === 0) && incoming.length === 0;
  const [historyOpen, setHistoryOpen] = useState(false);
  const lookups = buildMarketLookups({ playerTeam, rivalTeams, otherCategories, freeAgents });

  const salaryMass = (playerTeam?.riders || []).reduce((s, r) => s + (r.salary || 0), 0);
  const objectiveLabel = playerTeam?.expectation?.label ? `Top ${playerTeam.expectation.max}` : "—";
  const historyCount = HISTORY_STATUS_ORDER.reduce((s, k) => s + groups[k].length, 0);

  return (
    <Panel title="Mercado de fichajes" icon={Handshake} accent={accent}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <StatCard icon={Wallet} label="Presupuesto" value={`€${Math.round(budget ?? 0).toLocaleString()}`} accent={accent} />
        <StatCard icon={TrendingUp} label="Masa salarial" value={`€${Math.round(salaryMass).toLocaleString()}`} accent={accent} />
        <StatCard icon={Users} label="Pilotos" value={`${(playerTeam?.riders || []).length}/2`} accent={accent} />
        <StatCard icon={Target} label="Objetivo" value={objectiveLabel} accent={accent} />
      </div>

      {isEmpty ? (
        <p className="text-sm" style={{ color: COLORS.muted }}>No tenés ninguna negociación en marcha.</p>
      ) : (
        <div className="space-y-4">
          {incoming.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>Ofertas recibidas ({incoming.length})</div>
              <div className="space-y-2">
                {incoming.map((neg) => (
                  <IncomingOfferCard key={neg.id} neg={neg} accent={accent} lookups={lookups} onRespondToIncomingOffer={onRespondToIncomingOffer} />
                ))}
              </div>
            </div>
          )}

          {ACTIVE_STATUS_ORDER.filter((key) => groups[key].length > 0).map((key) => (
            <div key={key}>
              <div className="text-xs uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>{STATUS_META[key].label} ({groups[key].length})</div>
              <div className="space-y-1.5">
                {groups[key].map((neg) => (
                  <NegotiationCard key={neg.id} neg={neg} accent={accent} lookups={lookups} statusKey={key} onOpenNegotiation={onOpenNegotiation} />
                ))}
              </div>
            </div>
          ))}

          {historyCount > 0 && (
            <div>
              <button onClick={() => setHistoryOpen((v) => !v)} className="text-xs uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>
                {historyOpen ? "▾" : "▸"} Historial ({historyCount})
              </button>
              {historyOpen && (
                <div className="space-y-3">
                  {HISTORY_STATUS_ORDER.filter((key) => groups[key].length > 0).map((key) => (
                    <div key={key}>
                      <div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>{STATUS_META[key].label}</div>
                      <div className="space-y-1.5">
                        {groups[key].map((neg) => (
                          <NegotiationCard key={neg.id} neg={neg} accent={accent} lookups={lookups} statusKey={key} onOpenNegotiation={onOpenNegotiation} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
