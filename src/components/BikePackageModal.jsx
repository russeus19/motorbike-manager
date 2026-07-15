import { ArrowRight, PackageCheck, TrendingDown, TrendingUp, X } from "lucide-react";
import { COLORS } from "../data/colors.js";
import { BIKE_LABELS } from "../data/bikeAreas.js";
import { WAREHOUSE_LABELS } from "../data/warehouseParts.js";
import { AREA_TO_WAREHOUSE_PART } from "../utils/bikeDevelopment.js";

/** One area's before → after comparison, reused for both the gain side
 * and the downside side so they look identical except for the color and
 * the direction of the arrow. */
function BeforeAfterRow({ label, before, after, positive, accent }) {
  const clampedAfter = Math.max(1, Math.min(99, after));
  return (
    <div className="rounded-md p-3 mb-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="flex items-center gap-1.5 font-bold" style={{ color: positive ? accent : COLORS.danger, fontFamily: "Rajdhani, sans-serif" }}>
          {positive ? <TrendingUp size={15} /> : <TrendingDown size={15} />} {label}
        </span>
        <span className="text-xs" style={{ color: positive ? accent : COLORS.danger }}>
          {positive ? "+" : "-"}{Math.abs(clampedAfter - before)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm font-mono">
        <span style={{ color: COLORS.muted }}>{before}</span>
        <ArrowRight size={14} style={{ color: COLORS.muted }} />
        <span style={{ color: positive ? accent : COLORS.danger, fontWeight: 700 }}>{clampedAfter}</span>
      </div>
      <div className="h-1.5 rounded-full w-full mt-2" style={{ background: COLORS.rule }}>
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${clampedAfter}%`, background: positive ? accent : COLORS.danger }} />
      </div>
    </div>
  );
}

export function BikePackageModal({ pkg, playerTeam, accent, onClose, onAccept, onDiscard }) {
  if (!pkg) return null;
  const gainAreaBefore = playerTeam.bike[pkg.area];
  const gainAreaAfter = gainAreaBefore + pkg.gain;
  const hasDownside = !!pkg.downsideArea;
  const downsideAreaBefore = hasDownside ? playerTeam.bike[pkg.downsideArea] : null;
  const downsideAreaAfter = hasDownside ? downsideAreaBefore - pkg.downsideAmount : null;

  const part = AREA_TO_WAREHOUSE_PART[pkg.area];
  const stock = playerTeam.warehouse?.[part]?.stock ?? 0;
  const readyToInstall = stock >= 2;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border" style={{ background: COLORS.panel, borderColor: COLORS.rule, maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 pb-3 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
          <div className="flex items-center gap-2.5">
            <PackageCheck size={26} style={{ color: accent }} />
            <div>
              <h3 className="text-xl font-bold" style={{ fontFamily: "Rajdhani, sans-serif" }}>Nuevo paquete de {BIKE_LABELS[pkg.area]}</h3>
              <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>Resultado del desarrollo: {pkg.tier}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-full flex-shrink-0" style={{ background: COLORS.panel2, color: COLORS.muted }}><X size={18} /></button>
        </div>

        <div className="p-5 pt-4" style={{ overflowY: "auto" }}>
          <BeforeAfterRow label={BIKE_LABELS[pkg.area]} before={gainAreaBefore} after={gainAreaAfter} positive accent={accent} />
          {hasDownside ? (
            <BeforeAfterRow label={BIKE_LABELS[pkg.downsideArea]} before={downsideAreaBefore} after={downsideAreaAfter} positive={false} accent={accent} />
          ) : (
            <div className="rounded-md p-2.5 mb-2 text-xs" style={{ background: "rgba(63,145,66,0.12)", border: "1px solid #3F9142", color: "#3F9142" }}>
              Paquete limpio: no ha traído ninguna contrapartida a otras áreas.
            </div>
          )}

          <div className="text-xs mt-3 mb-4" style={{ color: COLORS.muted }}>
            {readyToInstall
              ? `Hay piezas de ${WAREHOUSE_LABELS[part]} suficientes en el almacén para instalarlo en las dos motos ahora mismo.`
              : `Necesitarás fabricar piezas de ${WAREHOUSE_LABELS[part]} para las dos motos — al aceptar, se pondrán en fabricación y se instalará automáticamente en cuanto estén listas.`}
          </div>

          <div className="flex gap-2">
            <button onClick={onDiscard} className="flex-1 py-2.5 rounded-md text-sm font-semibold" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, color: COLORS.muted }}>
              Descartar
            </button>
            <button onClick={onAccept} className="flex-1 py-2.5 rounded-md text-sm font-bold text-white" style={{ background: accent }}>
              {readyToInstall ? "Instalar" : "Aceptar y fabricar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
