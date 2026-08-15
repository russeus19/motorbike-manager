import { useState } from "react";
import { ChevronDown, ChevronUp, Timer, Eye, Sparkles, X, ChevronRight, FileText, Users, TrendingUp } from "lucide-react";
import { Panel } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { CountryFlag } from "./CountryFlag.jsx";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { ProgressRing } from "./ProgressRing.jsx";
import { sportingDirectorTierFor, ensureSportingDirector, sportingDirectorUpgradeSpecFor, canStartSportingDirectorUpgrade, rookieClassVisibleSlice, SPORTING_DIRECTOR_TIERS } from "../utils/scouting.js";

const ROOKIE_CLASS_CATEGORIES = ["moto3", "worldwcr", "supersport", "sportbike"];

function StatChip({ icon: Icon, value, label }) {
  return (
    <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
      <Icon size={16} style={{ color: COLORS.gold }} className="flex-shrink-0" />
      <div>
        <div className="text-lg font-bold leading-none" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{value}</div>
        <div className="text-[9px] uppercase tracking-wider" style={{ color: COLORS.muted }}>{label}</div>
      </div>
    </div>
  );
}

/** A rider "found" card — used identically for a scout report and for
 * a rookie-class debutant, both really the same shape of thing (a
 * prospect the club has some read on): photo, flag, name, age,
 * category, and a potential range badge. */
function ProspectCard({ riderId, photoId, name, nat, age, gender, categoryLabel, potentialRange, extraLine, accent, onOpen }) {
  return (
    <button onClick={onOpen} className="text-left rounded-lg overflow-hidden flex-shrink-0" style={{ width: 148, background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
      <RiderPhoto riderId={photoId || riderId} gender={gender} size={148} className="w-full" />
      <div className="p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          {nat && <CountryFlag nat={nat} width={14} />}
          <span className="text-sm font-bold truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{name}</span>
        </div>
        <div className="text-[10px] mb-2" style={{ color: COLORS.muted }}>{age ? `${age} años · ` : ""}{categoryLabel}</div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-wider" style={{ color: COLORS.muted }}>Potencial</span>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: `${accent}24`, color: accent, fontFamily: "Rajdhani, sans-serif" }}>{potentialRange}</span>
        </div>
        {extraLine && <div className="text-[10px] mt-1" style={{ color: COLORS.muted }}>{extraLine}</div>}
      </div>
    </button>
  );
}

/**
 * Director Deportivo: decide cuántos ojeadores tienes a la vez, cuánto
 * tarda cada informe y cuánto se estrecha la horquilla de potencial.
 * Mismo patrón de nivel/mejora que Fábrica y Staff — sin retroceso,
 * ya que no tiene sentido "despedir" ojeadores.
 *
 * Redesigned to match the card-based visual language of the other
 * recently-updated panels (Escudería, Mi moto, Mis pilotos) — real
 * photos, flags and Rajdhani numbers instead of plain text rows. The
 * Football Manager-style reference this was modeled on shows several
 * named individual scouts, a "conocimiento" star rating, regions-
 * covered stats and so on — none of that exists in this game yet, so
 * none of it is faked here; every card and number below reflects a
 * real, working part of our own single-Sporting-Director system.
 */
export function SportingDirectorPanel({ playerTeam, categoryKey, seasonNumber, freeAgents, budget, onStartUpgrade, onCancelScout, onOpenRiderProfileById, accent, scale }) {
  const [expanded, setExpanded] = useState(false);
  const sd = ensureSportingDirector(playerTeam);
  const tier = sportingDirectorTierFor(sd.level);
  const tierIndex = SPORTING_DIRECTOR_TIERS.indexOf(tier);
  const nextTier = SPORTING_DIRECTOR_TIERS[tierIndex + 1];
  const levelProgress = nextTier ? (sd.level - tier.min) / (nextTier.min - tier.min) : 1;
  const spec = sportingDirectorUpgradeSpecFor(playerTeam, scale);
  const canStart = !sd.upgrading && !!canStartSportingDirectorUpgrade(playerTeam, budget, scale);
  const missions = playerTeam.scoutingMissions || [];
  const scoutedEntries = Object.entries(playerTeam.scoutReports || {});

  const rookieClass = ROOKIE_CLASS_CATEGORIES.includes(categoryKey)
    ? rookieClassVisibleSlice(freeAgents, categoryKey, seasonNumber, sd.level)
    : [];
  const rookieClassTotal = (freeAgents || []).filter((r) => r._rookieClassSeason === seasonNumber && (r._rookieClassSharedCategories || []).includes(categoryKey)).length;

  return (
    <Panel
      title="Director Deportivo"
      icon={Eye}
      accent={accent}
      onHeaderClick={() => setExpanded((v) => !v)}
      headerRight={
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color: COLORS.text }}>{tier.name} · Nivel {sd.level}</span>
          {expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
        </span>
      }
    >
      {expanded && (
        <>
      <div className="rounded-lg p-3 mb-4" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xl font-bold" style={{ fontFamily: "Rajdhani, sans-serif", color: accent }}>{tier.name}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: COLORS.muted }}>Nivel {sd.level}</div>
          </div>
          <div className="flex gap-1.5">
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>{tier.slots} ojeador{tier.slots === 1 ? "" : "es"}</span>
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>{tier.weeksPerReport} sem/informe</span>
          </div>
        </div>
        {nextTier && (
          <div className="h-1.5 rounded-full w-full mb-3" style={{ background: COLORS.rule }}>
            <div className="h-1.5 rounded-full" style={{ width: `${levelProgress * 100}%`, background: accent }} />
          </div>
        )}
        <p className="text-xs mb-3" style={{ color: COLORS.muted }}>
          Cuanto mayor el nivel, más ojeadores a la vez, informes más rápidos, y una horquilla de potencial más ajustada a la verdad de cada piloto.
        </p>

        {sd.upgrading ? (
          <div className="flex items-center gap-3">
            <ProgressRing progress={(sd.upgrading.totalGp - sd.upgrading.remaining) / sd.upgrading.totalGp} size={44} strokeWidth={4} accent={accent}>
              <Timer size={16} style={{ color: accent }} />
            </ProgressRing>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: COLORS.text }}>Ampliación en marcha</div>
              <div className="text-xs" style={{ color: COLORS.muted }}>{sd.upgrading.remaining}/{sd.upgrading.totalGp} GP restantes · +{sd.upgrading.gain} niveles al terminar</div>
            </div>
          </div>
        ) : sd.level >= 99 ? (
          <p className="text-xs" style={{ color: COLORS.gold }}>Nivel máximo alcanzado.</p>
        ) : (
          <button disabled={!canStart} onClick={onStartUpgrade}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left disabled:opacity-40"
            style={{ background: `${accent}1F`, border: `1px solid ${accent}55` }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: COLORS.panel }}>
              <TrendingUp size={16} style={{ color: accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold" style={{ color: COLORS.text }}>Ampliar Dirección Deportiva (+{spec.gain} niveles)</div>
              <div className="text-xs" style={{ color: COLORS.muted }}>€{spec.money.toLocaleString()} · {spec.gp} GP</div>
            </div>
            <ChevronRight size={18} style={{ color: COLORS.muted }} className="flex-shrink-0" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatChip icon={Users} value={`${missions.length}/${tier.slots}`} label="En misión" />
        <StatChip icon={FileText} value={scoutedEntries.length} label="Informes" />
        {ROOKIE_CLASS_CATEGORIES.includes(categoryKey)
          ? <StatChip icon={Sparkles} value={`${rookieClass.length}/${rookieClassTotal}`} label="Rookies" />
          : <StatChip icon={TrendingUp} value={`${sd.level}/99`} label="Progreso" />}
      </div>

      <div className="mb-4">
        <div className="text-xs uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Ojeadores en misión</div>
        {missions.length === 0 ? (
          <p className="text-xs" style={{ color: COLORS.muted }}>Ninguno en marcha. Envía un ojeador desde la ficha de cualquier piloto que aún no conozcas del todo.</p>
        ) : (
          <div className="space-y-2">
            {missions.map((m) => (
              <div key={m.riderId} className="rounded-lg p-2.5 flex items-center gap-3" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                <RiderPhoto riderId={m.riderPhotoId || m.riderId} gender={m.riderGender} size={44} className="rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <button className="text-left hover:underline flex items-center gap-1.5" onClick={() => onOpenRiderProfileById(m.riderId, m.categoryKey)}>
                    {m.riderNat && <CountryFlag nat={m.riderNat} width={14} />}
                    <span className="text-sm font-bold truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{m.riderName || "Piloto"}</span>
                  </button>
                  <div className="text-[10px]" style={{ color: COLORS.muted }}>{m.riderAge ? `${m.riderAge} años` : ""}</div>
                </div>
                <ProgressRing progress={(m.totalWeeks - m.weeksRemaining) / m.totalWeeks} size={40} strokeWidth={4} accent={accent}>
                  <span className="text-[10px] font-bold" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{m.weeksRemaining}</span>
                </ProgressRing>
                <button onClick={() => onCancelScout(m.riderId)} title="Cancelar ojeo" className="flex-shrink-0">
                  <X size={15} style={{ color: COLORS.danger }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="text-xs uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Informes recibidos ({scoutedEntries.length})</div>
        {scoutedEntries.length === 0 ? (
          <p className="text-xs" style={{ color: COLORS.muted }}>Todavía no has completado ningún informe.</p>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
            {scoutedEntries.map(([riderId, report]) => (
              <ProspectCard
                key={riderId}
                riderId={riderId}
                photoId={report.riderPhotoId}
                gender={report.riderGender}
                name={report.riderName || "Piloto"}
                nat={report.riderNat}
                age={report.riderAge}
                categoryLabel={report.categoryKey || ""}
                potentialRange={`${report.potentialRange[0]}–${report.potentialRange[1]}`}
                extraLine={`Moral: ${report.moraleValue != null ? report.moraleValue : "? (caducado)"}`}
                accent={accent}
                onOpen={() => onOpenRiderProfileById(riderId, report.categoryKey)}
              />
            ))}
          </div>
        )}
      </div>

      {ROOKIE_CLASS_CATEGORIES.includes(categoryKey) && (
        <div>
          <div className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: COLORS.muted }}>
            <Sparkles size={12} /> Nueva hornada de rookies ({rookieClass.length}/{rookieClassTotal} detectados)
          </div>
          {categoryKey !== "worldwcr" && (
            <p className="text-xs mb-2" style={{ color: COLORS.muted }}>Fondo común con Moto3, WorldSSP y WorldSPB — cada piloto puede acabar fichando por cualquiera de las tres.</p>
          )}
          {rookieClass.length === 0 ? (
            <p className="text-xs" style={{ color: COLORS.muted }}>Con este nivel de Director Deportivo todavía no detectáis a ningún debutante de la nueva hornada.</p>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
              {rookieClass.map(({ rider, ca, potentialRange }) => (
                <ProspectCard
                  key={rider.id}
                  riderId={rider.id}
                  photoId={rider.photoId}
                  gender={rider.gender}
                  name={rider.name}
                  nat={rider.nat}
                  age={rider.age}
                  categoryLabel={`CA ${ca}`}
                  potentialRange={`${potentialRange[0]}–${potentialRange[1]}`}
                  accent={accent}
                  onOpen={() => onOpenRiderProfileById(rider.id, categoryKey)}
                />
              ))}
            </div>
          )}
          <p className="text-xs mt-2" style={{ color: COLORS.muted }}>Libres para fichar por cualquier equipo de cara a la próxima temporada. Si nadie los ficha, pasarán a agentes libres normales.</p>
        </div>
      )}
        </>
      )}
    </Panel>
  );
}
