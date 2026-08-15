import { useState } from "react";
import { AlertTriangle, Award, ChevronDown, ChevronUp } from "lucide-react";
import { Panel } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { ensureSponsors } from "../utils/sponsors.js";
import { SponsorLogo } from "./SponsorLogo.jsx";

const SLOT_LABEL = { main: "Patrocinador principal", secondary: "Patrocinador secundario" };

/** The same logo-box treatment BikeHero's own "Patrocinadores actuales"
 * section already uses — role label centered above a 4:1 frame (a
 * good match for the 600x300 logos being uploaded, see
 * public/assets/sponsors/README.md), logo shrunk to fit inside rather
 * than overflowing it. Reused here rather than styled separately, so
 * a sponsor's logo looks the same wherever it appears in the game. */
function SponsorLogoBox({ kind, name }) {
  return (
    <div className="mb-2.5">
      <div className="text-[10px] font-semibold text-center mb-1.5 uppercase tracking-wider" style={{ color: COLORS.muted }}>{SLOT_LABEL[kind]}</div>
      <div className="rounded-lg p-1.5 flex items-center justify-center" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, aspectRatio: "4 / 1" }}>
        <SponsorLogo name={name} height={80} className="max-h-full" />
      </div>
    </div>
  );
}

/** A small pill, same visual language as the category/tier/manufacturer
 * tags in the redesigned Escudería card — reused here for a sponsor's
 * own tier (Élite, Internacional...), instead of the plain muted text
 * it used to be. */
function Pill({ children, tone = "neutral", accent }) {
  const styles = tone === "accent"
    ? { background: `${accent}1F`, border: `1px solid ${accent}55`, color: accent }
    : { background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text };
  return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={styles}>{children}</span>;
}

export function SponsorSlot({ kind, sponsor, offers, prospectingStreak, searching, onChoose, onSearch, onCancelSearch, onCancelContract, accent }) {
  return (
    <div className="rounded-lg p-3" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
      {sponsor ? (
        <>
          <SponsorLogoBox kind={kind} name={sponsor.name} />
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-lg font-bold" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{sponsor.name}</span>
            <span className="text-lg font-bold" style={{ fontFamily: "Rajdhani, sans-serif", color: accent }}>+€{sponsor.payoutPerGp.toLocaleString()}<span className="text-xs font-normal" style={{ color: COLORS.muted }}>/GP</span></span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <Pill accent={accent} tone="accent">Nivel {sponsor.tier}</Pill>
            <Pill accent={accent}>{sponsor.yearsLeft} temporada{sponsor.yearsLeft === 1 ? "" : "s"} restante{sponsor.yearsLeft === 1 ? "" : "s"}</Pill>
            {sponsor.bonusPerPoint > 0 && <Pill accent={accent}>+€{sponsor.bonusPerPoint.toLocaleString()}/punto</Pill>}
          </div>
          {sponsor.permanent ? (
            <div className="text-xs flex items-center gap-1.5" style={{ color: COLORS.muted }}>
              <Award size={12} className="flex-shrink-0" /> Patrocinio permanente — {sponsor.name} respalda este proyecto y nunca lo abandonará ni podrá rescindirse.
            </div>
          ) : (
            <>
              {sponsor.scorelessStreak >= 2 && (
                <div className="text-xs mb-2 flex items-center gap-1.5" style={{ color: COLORS.danger }}>
                  <AlertTriangle size={12} className="flex-shrink-0" />
                  {sponsor.scorelessStreak} carreras seguidas por debajo de lo esperado — el contrato corre riesgo de rescisión anticipada.
                </div>
              )}
              <button onClick={() => onCancelContract(kind)}
                className="w-full text-xs px-2.5 py-1.5 rounded-md font-semibold"
                style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.danger }}>
                Rescindir contrato (coste: €{Math.round(sponsor.payoutPerGp * sponsor.yearsLeft * 1.5).toLocaleString()})
              </button>
            </>
          )}
        </>
      ) : offers && offers.length ? (
        <>
          <div className="text-[10px] font-semibold text-center mb-2 uppercase tracking-wider" style={{ color: COLORS.muted }}>{SLOT_LABEL[kind]} — elige uno</div>
          <div className="space-y-1.5">
            {offers.map((o) => (
              <button key={o.id} onClick={() => onChoose(kind, o)}
                className="w-full text-left rounded-md p-2 flex items-center gap-2.5"
                style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
                <div className="rounded p-1 flex-shrink-0 flex items-center justify-center" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, width: 64, aspectRatio: "2 / 1" }}>
                  <SponsorLogo name={o.name} height={28} className="max-h-full max-w-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: COLORS.text }}>{o.name}</div>
                  <div className="text-[11px]" style={{ color: COLORS.muted }}>{o.tier} · {o.years} temporada{o.years === 1 ? "" : "s"}</div>
                </div>
                <span className="text-xs font-mono flex-shrink-0" style={{ color: accent }}>+€{o.payoutPerGp.toLocaleString()}/GP{o.bonusPerPoint ? ` · +€${o.bonusPerPoint.toLocaleString()}/pt` : ""}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="text-[10px] font-semibold text-center mb-2 uppercase tracking-wider" style={{ color: COLORS.muted }}>{SLOT_LABEL[kind]}</div>
          <div className="rounded-lg p-3 flex items-center justify-center mb-2" style={{ background: COLORS.panel, border: `1px dashed ${COLORS.rule}`, aspectRatio: "4 / 1" }}>
            <span className="text-xs" style={{ color: COLORS.muted }}>Hueco libre</span>
          </div>
          {prospectingStreak >= 2 && (
            <div className="text-xs mb-2" style={{ color: COLORS.gold }}>
              {prospectingStreak} carreras seguidas superando lo esperado — está empezando a atraer interés.
            </div>
          )}
          {searching ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs" style={{ color: COLORS.gold }}>Buscando patrocinador activamente...</span>
              <button onClick={() => onCancelSearch(kind)} className="text-xs px-2 py-1 rounded-md flex-shrink-0"
                style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.muted }}>
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={() => onSearch(kind)}
              className="w-full text-xs px-2.5 py-1.5 rounded-md font-semibold"
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
 *
 * Visually matched to the redesigned Escudería/Mi moto cards — the
 * same real sponsor logos (SponsorLogo), the same pill tags, the same
 * Rajdhani numbers — rather than its own separate look.
 */
export function SponsorsPanel({ playerTeam, onChooseSponsorOffer, onSearchSponsor, onCancelSearchSponsor, onCancelSponsorContract, accent, expanded: expandedProp, onToggleExpanded }) {
  // Bug fixed (feature): expanded state used to be entirely internal,
  // with no way for another panel (see the new "Patrocinadores" tap
  // target in "Mi moto") to open this one directly. Controlled from
  // outside when expanded/onToggleExpanded are given; falls back to
  // its own internal state otherwise, same pattern already used for
  // EconomyPanel.
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = expandedProp ?? internalExpanded;
  const setExpanded = onToggleExpanded ?? setInternalExpanded;
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <SponsorSlot kind="main" sponsor={sponsors.main} offers={pendingSponsorOffers?.main} prospectingStreak={sponsorProspecting?.main || 0} searching={sponsorSearching?.main} onChoose={onChooseSponsorOffer} onSearch={onSearchSponsor} onCancelSearch={onCancelSearchSponsor} onCancelContract={onCancelSponsorContract} accent={accent} />
            <SponsorSlot kind="secondary" sponsor={sponsors.secondary} offers={pendingSponsorOffers?.secondary} prospectingStreak={sponsorProspecting?.secondary || 0} searching={sponsorSearching?.secondary} onChoose={onChooseSponsorOffer} onSearch={onSearchSponsor} onCancelSearch={onCancelSearchSponsor} onCancelContract={onCancelSponsorContract} accent={accent} />
          </div>
        </>
      )}
    </Panel>
  );
}
