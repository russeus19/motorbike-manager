import { COLORS } from "../data/colors.js";
import { SEASON_TABS } from "../data/navigationTabs.js";

export function BottomNavBar({ active, onChange, accent }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex" style={{ background: COLORS.panel, borderTop: `1px solid ${COLORS.rule}`, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {SEASON_TABS.map((t) => {
        const isActive = active === t.key;
        const Icon = t.icon;
        return (
          <button key={t.key} onClick={() => onChange(t.key)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2"
            style={{ color: isActive ? accent : COLORS.muted }}>
            <Icon size={20} />
            <span className="text-[10px] font-semibold" style={{ fontFamily: "Rajdhani, sans-serif" }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

