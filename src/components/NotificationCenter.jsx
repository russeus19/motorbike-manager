import { useState } from "react";
import { Bell, Flag, X } from "lucide-react";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { CATEGORY_DATA, CATEGORY_ORDER } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { NOTIF_ICON } from "../data/notificationIcons.js";

export function NotificationCenterModal({ notifications, category, onClose }) {
  const [tab, setTab] = useState(category);
  const items = notifications[tab] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border flex flex-col" style={{ background: COLORS.panel, borderColor: COLORS.rule, maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
          <h3 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>
            <Bell size={20} style={{ color: COLORS.gold }} /> Centro de Notificaciones
          </h3>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-full" style={{ background: COLORS.panel2, color: COLORS.muted }}><X size={18} /></button>
        </div>
        <div className="flex gap-2 px-5 pt-4 flex-shrink-0">
          {CATEGORY_ORDER.map((ck) => (
            <button key={ck} onClick={() => setTab(ck)}
              className="flex-1 text-xs px-2 py-1.5 rounded font-semibold"
              style={{
                background: tab === ck ? COLORS.gold : COLORS.panel2,
                color: tab === ck ? "#12151A" : COLORS.muted,
                border: `1px solid ${tab === ck ? COLORS.gold : COLORS.rule}`,
                fontFamily: "Rajdhani, sans-serif",
              }}>
              {CATEGORY_DATA[ck].label}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto p-5 pt-3">
          <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Últimas noticias de {CATEGORY_DATA[tab].label}.</p>
          {items.length === 0 && (
            <p className="text-sm" style={{ color: COLORS.muted }}>Todavía no hay noticias de {CATEGORY_DATA[tab].label}.</p>
          )}
          <ul className="space-y-2.5">
            {items.map((n, i) => {
              const Icon = NOTIF_ICON[n.type] || Flag;
              return (
                <li key={i} className="flex items-start gap-2.5 text-sm rounded-md p-2.5" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                  {n.riderId ? (
                    <RiderPhoto riderId={n.riderId} size={28} shape="circle" />
                  ) : (
                    <Icon size={15} style={{ color: n.type === "injury" ? COLORS.danger : COLORS.gold, flexShrink: 0, marginTop: 2 }} />
                  )}
                  <span style={{ color: COLORS.text }}>{n.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

