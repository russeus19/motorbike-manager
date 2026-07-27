import { useState } from "react";
import { ArrowDown, ArrowLeftRight, ArrowUp, ChevronRight, DoorOpen, Flag, PenLine, RefreshCw } from "lucide-react";
import { CATEGORY_DATA, CATEGORY_ORDER } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { MARKET_LOG_ORDER, MARKET_LOG_TITLES } from "../data/marketLogMeta.js";

const MARKET_LOG_LUCIDE = { ascenso: ArrowUp, descenso: ArrowDown, fichaje: PenLine, renovacion: RefreshCw, salida: DoorOpen, retiro: Flag };

export function MarketSummaryScreen({ summary, onContinue }) {
  const [tab, setTab] = useState("motogp");
  const groups = summary[tab] || {};
  const totalForTab = (catGroups) => MARKET_LOG_ORDER.reduce((s, key) => s + (catGroups[key]?.length || 0), 0);
  const isEmpty = MARKET_LOG_ORDER.every((key) => !groups[key]?.length);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-1">
        <ArrowLeftRight size={20} style={{ color: COLORS.gold }} />
        <span className="text-xs tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>Resumen del mercado</span>
      </div>
      <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "Rajdhani, sans-serif" }}>Así queda la parrilla</h2>

      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORY_ORDER.map((ck) => (
          <button key={ck} onClick={() => setTab(ck)}
            className="text-xs px-3 py-1.5 rounded-full font-semibold transition-transform active:scale-95"
            style={{
              background: tab === ck ? COLORS.gold : COLORS.panel2,
              color: tab === ck ? "#12151A" : COLORS.muted,
              border: `1px solid ${tab === ck ? COLORS.gold : COLORS.rule}`,
              fontFamily: "Rajdhani, sans-serif",
            }}>
            {CATEGORY_DATA[ck].label} ({totalForTab(summary[ck] || {})})
          </button>
        ))}
      </div>

      {isEmpty && (
        <p className="text-sm mb-6" style={{ color: COLORS.muted }}>No hubo movimientos de mercado reseñables en esta categoría.</p>
      )}

      <div className="space-y-4 mb-6">
        {MARKET_LOG_ORDER.filter((key) => groups[key]?.length).map((key) => {
          const Icon = MARKET_LOG_LUCIDE[key];
          return (
            <div key={key} className="rounded-2xl border p-4" style={{ background: COLORS.panel, borderColor: COLORS.rule, boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 26, height: 26, background: `${COLORS.gold}1F`, border: `1px solid ${COLORS.gold}` }}>
                  <Icon size={13} style={{ color: COLORS.gold }} />
                </div>
                <h3 className="text-xs tracking-widest uppercase font-semibold" style={{ color: COLORS.muted, fontFamily: "Rajdhani, sans-serif" }}>
                  {MARKET_LOG_TITLES[key]} ({groups[key].length})
                </h3>
              </div>
              <ul className="space-y-2">
                {groups[key].map((e, i) => (
                  <li key={i} className="text-sm rounded-xl px-3 py-2" style={{ background: COLORS.panel2, color: COLORS.text }}>
                    {e.text}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <button onClick={onContinue}
        className="w-full py-3 rounded-md font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
        style={{ background: COLORS.gold, color: "#12151A", fontFamily: "Rajdhani, sans-serif" }}>
        Empezar la nueva temporada <ChevronRight size={18} />
      </button>
    </div>
  );
}
