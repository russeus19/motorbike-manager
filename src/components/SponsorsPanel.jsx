import { useState } from "react";
import { AlertTriangle, Award, ChevronDown, ChevronUp } from "lucide-react";
import { Panel } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { ensureSponsors } from "../utils/sponsors.js";

const SLOT_LABEL = { main: "Patrocinador principal", secondary: "Patrocinador secundario" };

export function SponsorSlot({ kind, sponsor, offers, prospectingStreak, searching, onChoose, onSearch, onCancelSearch, onCancelContract, accent }) {
  return (
    <div className="rounded-md p-2.5" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
      <div className="text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>{SLOT_LABEL[kind]}</div>
      {sponsor ? (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{sponsor.name}</span>
            <span className="font-mono text-xs" style={{ color: accent }}>+€{sponsor.payoutPerGp.toLocaleString()}/GP</span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>
            Nivel {sponsor.tier} · Contrato: {sponsor.yearsLeft} temporada{sponsor.yearsLeft === 1 ? "" : "s"}
            {sponsor.bonusPerPoint > 0 && <> · +€{sponsor.bonusPerPoint.toLocaleString()} por punto</>}
          </div>
          {sponsor.permanent ? (
            <div className="text-xs mt-2 flex items-center gap-1" style={{ color: COLORS.muted }}>
              <Award size={11} /> Patrocinio permanente — {sponsor.name} respalda este proyecto y nunca lo abandonará ni podrá rescindirse.
            </div>
          ) : (
            <>
              {sponsor.scorelessStreak >= 2 && (
                <div className="text-xs mt-1 flex items-center gap-1" style={{ color: COLORS.danger }}>
                  <AlertTriangle size={11} />
                  {sponsor.scorelessStreak} carreras seguidas por debajo de lo esperado — el contrato corre riesgo de rescisión anticipada.
                </div>
              )}
              <button onClick={() => onCancelContract(kind)}
                className="w-full text-xs px-2.5 py-1.5 rounded mt-2"
                style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.danger }}>
                Rescindir contrato (coste: €{Math.round(sponsor.payoutPerGp * sponsor.yearsLeft * 1.5).toLocaleString()})
              </button>
            </>
          )}
        </>
      ) : offers && offers.length ? (
        <>
          <div className="text-xs mb-2" style={{ color: COLORS.muted }}>Hueco libre — elige nuevo patrocinador:</div>
          <div className="space-y-1.5">
            {offers.map((o) => (
              <button key={o.id} onClick={() => onChoose(kind, o)}
                className="w-full text-left text-xs px-2.5 py-1.5 rounded flex items-center justify-between gap-2"
                style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
                <span>{o.name} <span style={{ color: COLORS.muted }}>· {o.tier}</span></span>
                <span className="font-mono" style={{ color: accent }}>+€{o.payoutPerGp.toLocaleString()}/GP{o.bonusPerPoint ? ` (+€${o.bonusPerPoint.toLocaleString()}/pt)` : ""} · {o.years}a</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="text-xs" style={{ color: COLORS.muted }}>Sin patrocinador este hueco por ahora.</div>
          {prospectingStreak >= 2 && (
            <div className="text-xs mt-1" style={{ color: COLORS.gold }}>
              {prospectingStreak} carreras seguidas superando lo esperado — está empezando a atraer interés.
            </div>
          )}
          {searching ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs" style={{ color: COLORS.gold }}>Buscando patrocinador activamente...</span>
              <button onClick={() => onCancelSearch(kind)} className="text-xs px-2 py-1 rounded"
                style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.muted }}>
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={() => onSearch(kind)}
              className="w-full text-xs px-2.5 py-1.5 rounded mt-2"
              style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
              Búsqueda activa de patrocinador
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Patrocinadores: dos huecos (principal y secundario) cuyo pago por GP
 * y nivel dependen del prestigio del equipo y de sus pilotos (ver
 * utils/sponsors.js) — sube si el equipo va bien y su prestigio crece,
 * baja o se pierde el hueco si el rendimiento decae. Un patrocinador
 * puede además romper el contrato a mitad de temporada tras varias
 * carreras seguidas por debajo de la expectativa de posición del
 * equipo (no de si puntúa o no — un privateer cuya expectativa ya es
 * quedar fuera de puntos no se penaliza por eso). Las ofertas para
 * rellenar un hueco vacío se generan a fin de temporada, o antes si el
 * equipo supera su expectativa de forma consistente; elegir una es la
 * única decisión de patrocinio que toma el jugador directamente.
 */
export function SponsorsPanel({ playerTeam, onChooseSponsorOffer, onSearchSponsor, onCancelSearchSponsor, onCancelSponsorContract, accent }) {
  const [expanded, setExpanded] = useState(false);
  const { sponsors, pendingSponsorOffers, sponsorProspecting, sponsorSearching } = ensureSponsors(playerTeam);
  const totalPerGp = (sponsors.main?.payoutPerGp || 0) + (sponsors.secondary?.payoutPerGp || 0);
  const pendingCount = (pendingSponsorOffers?.main ? 1 : 0) + (pendingSponsorOffers?.secondary ? 1 : 0);

  return (
    <Panel
      title="Patrocinadores"
      icon={Award}
      accent={accent}
      onHeaderClick={() => setExpanded((v) => !v)}
      headerRight={
        <span className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: COLORS.gold, color: "#1a1a1a" }}>{pendingCount} por elegir</span>
          )}
          <span className="font-mono text-xs" style={{ color: COLORS.text }}>+€{totalPerGp.toLocaleString()}/GP</span>
          {expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
        </span>
      }
    >
      {expanded && (
        <>
          <p className="text-xs mb-3" style={{ color: COLORS.muted }}>
            El pago y el nivel de cada patrocinador dependen del prestigio del equipo y de tus pilotos. Un mal tramo de temporada (varias carreras seguidas por debajo de tu expectativa de posición) puede romper un contrato antes de tiempo; superarla de forma consistente puede atraer nuevos patrocinadores. Si un hueco lleva tiempo vacío y no hay visos de que llegue solo, puedes salir a buscarlo tú — la oferta será más floja que una que llegue de forma natural.
          </p>
          <div className="space-y-2">
            <SponsorSlot kind="main" sponsor={sponsors.main} offers={pendingSponsorOffers?.main} prospectingStreak={sponsorProspecting?.main || 0} searching={sponsorSearching?.main} onChoose={onChooseSponsorOffer} onSearch={onSearchSponsor} onCancelSearch={onCancelSearchSponsor} onCancelContract={onCancelSponsorContract} accent={accent} />
            <SponsorSlot kind="secondary" sponsor={sponsors.secondary} offers={pendingSponsorOffers?.secondary} prospectingStreak={sponsorProspecting?.secondary || 0} searching={sponsorSearching?.secondary} onChoose={onChooseSponsorOffer} onSearch={onSearchSponsor} onCancelSearch={onCancelSearchSponsor} onCancelContract={onCancelSponsorContract} accent={accent} />
          </div>
        </>
      )}
    </Panel>
  );
}
