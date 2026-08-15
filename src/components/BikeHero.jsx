import { useState } from "react";
import { Bike, ChevronDown, ChevronRight, ChevronUp, Trophy, Wrench } from "lucide-react";
import { Panel, StatBar } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { BIKE_AREA_KEYS, BIKE_LABELS } from "../data/bikeAreas.js";
import { bikeModelFor } from "../data/bikeModels.js";
import { bikeAvg } from "../utils/bikeDevelopment.js";
import { BikePhoto } from "./BikePhoto.jsx";
import { SponsorLogo } from "./SponsorLogo.jsx";
import { DevelopmentPanelBody } from "./Development.jsx";

/** Turns "Gran Premio de España — Circuito de Jerez" into just "España"
 * — the same short-name derivation CalendarPanel already uses for its
 * compact day cards. No longer used within this file itself (Temporada
 * actual / Próxima carrera were replaced by the bike's own attribute
 * bars), kept only in case a caller still passes `circuit` expecting
 * it to matter — currently unused, harmless to leave.
 */
function shortCircuitName(circuit) {
  if (!circuit) return null;
  return circuit.split("—")[0].replace("Gran Premio de ", "").replace("Ronda de ", "").trim();
}

/**
 * "Mi Moto" — a visual hero card for the team's own bike, matching the
 * Football Manager-style reference: brand + model, a real photo of
 * THIS team's bike (BikePhoto, resolved automatically from the team's
 * own logoId — see that file's own comment), overall performance,
 * season, next race, Desarrollo e Investigación itself (expands right
 * here, see below), and the team's current sponsors as real logos
 * (SponsorLogo, same auto-resolve pattern).
 *
 * Bug fixed (feature): "Desarrollo e investigación" used to be its own
 * separate Panel elsewhere on the Escudería screen, with this card's
 * own button just scrolling down to it. Now that content
 * (DevelopmentPanelBody, extracted out of Development.jsx's own
 * DevelopmentPanel so nothing is duplicated) expands directly inside
 * this same card — one less panel on the screen, and the whole "Mi
 * moto" identity (bike, performance, development, sponsors) lives in
 * one coherent place instead of split across two.
 *
 * Same shared Panel component, same title treatment as every other
 * panel on this screen (Escudería, Economía, Patrocinadores...) — a
 * bigger custom-styled header here would look like it belongs to a
 * different app.
 *
 * Model is only shown once known for that category+manufacturer (see
 * data/bikeModels.js) — MotoGP's five manufacturers are filled in;
 * everything else still shows the manufacturer alone until given.
 *
 * Mobile-first: the bike photo is the hero at the top on a narrow
 * screen (stacked layout), moving to a side-by-side layout matching
 * the reference once there's room for it (sm and up).
 */
export function BikeHero({ playerTeam, budget, startProject, scale, onOpenPackageReview, accent, seasonNumber, round, circuit, category, onOpenSponsors }) {
  const [devExpanded, setDevExpanded] = useState(false);
  const avg = Math.round(bikeAvg(playerTeam.bike));
  const model = bikeModelFor(category, playerTeam.manufacturer);
  const sponsors = playerTeam.sponsors || {};
  const sponsorList = [
    sponsors.main ? { ...sponsors.main, roleLabel: "Patrocinador principal" } : null,
    sponsors.secondary ? { ...sponsors.secondary, roleLabel: "Patrocinador oficial" } : null,
  ].filter(Boolean);

  return (
    <Panel title="Mi moto" icon={Bike} accent={accent}>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        {/* Bike photo: small and centered on mobile (unchanged); on sm
            and up, deliberately cropped in half — objectFit=cover with
            objectPosition anchored to the top shows only the upper
            portion of the bike (windscreen down to just above the
            front fender), cropping away the lower half (front wheel
            and below) rather than shrinking the whole bike to fit.
            Nothing is ever cut off AT the top — the crop only ever
            eats into the bottom — and the bottom fade blends that crop
            line into the panel instead of a hard cutoff. */}
        <div className="flex justify-center sm:flex-1 sm:justify-end sm:order-2">
          <div className="relative overflow-hidden sm:w-[500px] sm:h-[308px] md:w-[580px] md:h-[356px]">
            <BikePhoto team={playerTeam} categoryKey={category} accent={accent} size={180} sizeClassName="w-[180px] h-[180px] sm:w-full sm:h-full" objectFit="cover" objectPosition="center top" />
            <div className="hidden sm:block absolute inset-x-0 bottom-0 h-24 pointer-events-none" style={{ background: `linear-gradient(to top, ${COLORS.panel}, transparent)` }} />
          </div>
        </div>

        <div className="sm:order-1 sm:w-64 md:w-72 sm:flex-shrink-0 min-w-0">
          <div className={`text-3xl sm:text-4xl font-bold leading-none ${model ? "mb-1" : "mb-3"}`} style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>
            {playerTeam.manufacturer || "—"}
          </div>
          {model && (
            <div className="text-xl sm:text-2xl font-bold leading-tight mb-3 sm:mb-4" style={{ fontFamily: "Rajdhani, sans-serif", color: accent }}>
              {model}
            </div>
          )}

          <div className="flex items-center gap-2.5 mb-3">
            <Trophy size={16} style={{ color: accent }} className="flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] sm:text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Rendimiento global</span>
                <span className="text-sm sm:text-base font-bold" style={{ color: accent, fontFamily: "Rajdhani, sans-serif" }}>{avg}/100</span>
              </div>
              <div className="h-1.5 rounded-full w-full mt-1" style={{ background: COLORS.rule }}>
                <div className="h-1.5 rounded-full" style={{ width: `${avg}%`, background: accent }} />
              </div>
            </div>
          </div>

          {/* The same 5 bike attributes/bars shown inside Desarrollo e
              investigación (DevelopmentPanelBody), reused here in place
              of the old Temporada actual / Próxima carrera stats — kept
              to this column's own fixed width (not the full row), so
              the bars stay proportionate and never stretch out under
              the bike photo. */}
          <div>
            {BIKE_AREA_KEYS.map((k) => (
              <StatBar key={k} label={BIKE_LABELS[k]} value={playerTeam.bike[k]} accent={accent} />
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <button onClick={() => setDevExpanded((v) => !v)}
          className="w-full flex items-center gap-3 rounded-lg px-3.5 py-3 text-left"
          style={{ background: `${accent}1F`, border: `1px solid ${accent}55` }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: COLORS.panel2 }}>
            <Wrench size={16} style={{ color: accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold" style={{ color: COLORS.text }}>Desarrollo e investigación</div>
            <div className="text-xs" style={{ color: COLORS.muted }}>Mejora los atributos de tu moto y desarrolla la máquina del futuro.</div>
          </div>
          {devExpanded ? <ChevronUp size={18} style={{ color: COLORS.muted }} className="flex-shrink-0" /> : <ChevronRight size={18} style={{ color: COLORS.muted }} className="flex-shrink-0" />}
        </button>
        {devExpanded && (
          <div className="mt-3">
            <DevelopmentPanelBody playerTeam={playerTeam} budget={budget} startProject={startProject} accent={accent} scale={scale} onOpenPackageReview={onOpenPackageReview} showAttributes={false} />
          </div>
        )}
      </div>

      {sponsorList.length > 0 && (
        <button onClick={onOpenSponsors} disabled={!onOpenSponsors} className="w-full text-left disabled:cursor-default">
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Patrocinadores actuales</div>
          <div className="grid grid-cols-2 gap-3">
            {sponsorList.map((s, i) => (
              <div key={i}>
                <div className="text-[10px] font-semibold text-center mb-1.5" style={{ color: accent }}>{s.roleLabel}</div>
                {/* Box fills the grid column's full width again, same
                    as originally — height halved via aspectRatio 4/1
                    (double the original 2/1) rather than a fixed
                    pixel value, so it stays exactly half regardless of
                    the column's actual rendered width. The logo is
                    properly contained inside (max-h-full), shrinking
                    to fit rather than overflowing the frame. */}
                <div className="rounded-lg p-1.5 flex items-center justify-center" style={{ border: `1px solid ${COLORS.rule}`, aspectRatio: "4 / 1" }}>
                  <SponsorLogo name={s.name} height={80} className="max-h-full" />
                </div>
              </div>
            ))}
          </div>
        </button>
      )}
    </Panel>
  );
}
