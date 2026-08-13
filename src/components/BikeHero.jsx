import { useState } from "react";
import { Bike, Calendar, ChevronDown, ChevronRight, ChevronUp, Flag, Trophy, Wrench } from "lucide-react";
import { Panel } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { bikeModelFor } from "../data/bikeModels.js";
import { bikeAvg } from "../utils/bikeDevelopment.js";
import { BikePhoto } from "./BikePhoto.jsx";
import { SponsorLogo } from "./SponsorLogo.jsx";
import { DevelopmentPanelBody } from "./Development.jsx";

/** Turns "Gran Premio de España — Circuito de Jerez" into just "España"
 * — the same short-name derivation CalendarPanel already uses for its
 * compact day cards, reused here for the "Próxima carrera" stat. */
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
export function BikeHero({ playerTeam, budget, startProject, scale, onOpenPackageReview, accent, seasonNumber, round, circuit, category }) {
  const [devExpanded, setDevExpanded] = useState(false);
  const avg = Math.round(bikeAvg(playerTeam.bike));
  const circuitLabel = shortCircuitName(circuit);
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
        <div className="flex justify-center sm:order-2 sm:flex-1 sm:relative sm:overflow-hidden sm:h-[380px] md:h-[440px]">
          <BikePhoto team={playerTeam} accent={accent} size={180} sizeClassName="w-[180px] h-[180px] sm:w-full sm:h-full" objectFit="cover" objectPosition="center top" />
          <div className="hidden sm:block absolute inset-x-0 bottom-0 h-24 pointer-events-none" style={{ background: `linear-gradient(to top, ${COLORS.panel}, transparent)` }} />
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

          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-start gap-2.5">
              <Trophy size={16} style={{ color: accent }} className="flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Rendimiento global</div>
                <div className="text-sm sm:text-base font-bold" style={{ color: accent, fontFamily: "Rajdhani, sans-serif" }}>{avg} / 100</div>
                <div className="h-1.5 rounded-full w-full max-w-[160px] mt-1" style={{ background: COLORS.rule }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${avg}%`, background: accent }} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Calendar size={16} style={{ color: accent }} className="flex-shrink-0" />
              <div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Temporada actual</div>
                <div className="text-sm sm:text-base font-bold" style={{ color: COLORS.text }}>{seasonNumber}</div>
              </div>
            </div>

            {circuitLabel && (
              <div className="flex items-center gap-2.5">
                <Flag size={16} style={{ color: accent }} className="flex-shrink-0" />
                <div>
                  <div className="text-[10px] sm:text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Próxima carrera</div>
                  <div className="text-sm sm:text-base font-bold" style={{ color: accent }}>{circuitLabel}</div>
                  <div className="text-xs" style={{ color: COLORS.muted }}>Ronda {round + 1}/22</div>
                </div>
              </div>
            )}
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
            <DevelopmentPanelBody playerTeam={playerTeam} budget={budget} startProject={startProject} accent={accent} scale={scale} onOpenPackageReview={onOpenPackageReview} />
          </div>
        )}
      </div>

      {sponsorList.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Patrocinadores actuales</div>
          <div className="grid grid-cols-2 gap-2">
            {sponsorList.map((s, i) => (
              <div key={i} className="rounded-lg p-3 flex flex-col items-center justify-center gap-2" style={{ border: `1px solid ${COLORS.rule}`, minHeight: 76 }}>
                <SponsorLogo name={s.name} height={32} />
                <div className="text-[10px] font-semibold text-center" style={{ color: accent }}>{s.roleLabel}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
