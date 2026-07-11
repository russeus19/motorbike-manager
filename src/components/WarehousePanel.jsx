import { useState } from "react";
import { AlertTriangle, Box, ChevronDown, ChevronUp } from "lucide-react";
import { Panel } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { WAREHOUSE_ICONS, WAREHOUSE_LABELS, WAREHOUSE_PARTS } from "../data/warehouseParts.js";
import { initWarehouse, warehouseCost } from "../utils/warehouseEngine.js";

export function WarehousePanel({ playerTeam, budget, scale, onProduce, onUrgentProduce }) {
  const [expanded, setExpanded] = useState(false);
  const warehouse = playerTeam.warehouse || initWarehouse();
  const lowParts = WAREHOUSE_PARTS.filter((p) => warehouse[p].stock <= 2);

  return (
    <Panel
      title="Almacén"
      icon={Box}
      accent={playerTeam.color}
      onHeaderClick={() => setExpanded((v) => !v)}
      headerRight={
        <span className="flex items-center gap-2">
          {lowParts.length > 0 && <AlertTriangle size={14} style={{ color: COLORS.gold }} />}
          {expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
        </span>
      }
    >
      {!expanded && (
        <p className="text-xs" style={{ color: COLORS.muted }}>
          {lowParts.length === 0 ? "Stock saludable en las cuatro piezas." : `Stock bajo: ${lowParts.map((p) => WAREHOUSE_LABELS[p]).join(", ")}.`}
        </p>
      )}
      {expanded && (
        <div className="space-y-3">
          {WAREHOUSE_PARTS.map((part) => {
            const p = warehouse[part];
            const Icon = WAREHOUSE_ICONS[part];
            const stockColor = p.stock <= 1 ? COLORS.danger : p.stock <= 2 ? COLORS.gold : "#3F9142";
            const normalCost = warehouseCost(part, scale, false, playerTeam.factory?.level);
            const urgentCost = warehouseCost(part, scale, true, playerTeam.factory?.level);
            return (
              <div key={part} className="rounded-md p-3" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Icon size={15} style={{ color: playerTeam.color }} /> {WAREHOUSE_LABELS[part]}
                  </span>
                  <span className="font-mono text-sm" style={{ color: stockColor }}>{p.stock} en stock</span>
                </div>
                {p.orders.length > 0 && (
                  <div className="text-xs mb-2" style={{ color: COLORS.muted }}>
                    {p.orders.length} en fabricación · llega{p.orders.length === 1 ? "" : "n"} tras este Gran Premio
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => onProduce(part)} disabled={normalCost > budget}
                    className="flex-1 text-xs px-2 py-1.5 rounded disabled:opacity-30"
                    style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
                    Fabricar · €{normalCost.toLocaleString()} (1 GP)
                  </button>
                  <button onClick={() => onUrgentProduce(part)} disabled={urgentCost > budget}
                    className="flex-1 text-xs px-2 py-1.5 rounded disabled:opacity-30"
                    style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}`, color: COLORS.danger }}>
                    Urgente · €{urgentCost.toLocaleString()}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

