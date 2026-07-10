import { useState } from "react";
import { ChevronRight, Flag, FolderOpen, Rocket, Settings, Zap } from "lucide-react";
import { CheckerStrip } from "../components/UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";

/* Hero photo for the home screen. Drop the image file at this path in the
   project's `public` folder (already included at public/assets/hero-bike.png). */
const HERO_IMAGE_URL = "/assets/hero-bike.png";

export function HomeCard({ icon: Icon, title, description, onClick, delay, accent }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-5 flex items-center gap-4 transition-transform duration-150 active:scale-[0.97] hover:scale-[1.015]"
      style={{
        background: `linear-gradient(135deg, ${COLORS.panel} 0%, ${COLORS.panel2} 100%)`,
        border: `1px solid ${COLORS.rule}`,
        boxShadow: "0 10px 26px rgba(0,0,0,0.38)",
        animation: "homeCardIn 0.55s ease-out both",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 56, height: 56, background: "rgba(227,164,39,0.12)", border: "1px solid rgba(227,164,39,0.35)" }}>
        <Icon size={28} style={{ color: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-lg font-bold" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{title}</div>
        <div className="text-sm mt-0.5 leading-snug" style={{ color: COLORS.muted }}>{description}</div>
      </div>
      <ChevronRight size={22} style={{ color: COLORS.muted, flexShrink: 0 }} />
    </button>
  );
}


export function HomeScreen({ onQuick, onCareer, onLoad, storageOk }) {
  const [showSettingsHint, setShowSettingsHint] = useState(false);

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.bg }}>
      <style>{`
        @keyframes homeCardIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroPhotoDrift {
          0%, 100% { transform: scale(1.08) translate(0, 0); }
          50% { transform: scale(1.08) translate(-2.5%, 1.5%); }
        }
        @keyframes heroTitleIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroGlowPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.85; }
        }
      `}</style>

      {/* Settings — top left, thumb-reachable */}
      <div className="fixed top-4 left-4 z-40">
        <button
          onClick={() => setShowSettingsHint((v) => !v)}
          className="flex items-center justify-center rounded-full transition-transform active:scale-90"
          style={{ width: 46, height: 46, background: "rgba(27,31,38,0.75)", border: `1px solid ${COLORS.rule}`, backdropFilter: "blur(6px)" }}
          aria-label="Ajustes"
        >
          <Settings size={21} style={{ color: COLORS.text }} />
        </button>
        {showSettingsHint && (
          <div className="mt-2 text-xs px-3 py-2 rounded-lg whitespace-nowrap" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.muted, animation: "homeCardIn 0.2s ease-out both" }}>
            Ajustes — próximamente
          </div>
        )}
      </div>

      {/* HERO */}
      <div className="relative w-full overflow-hidden" style={{ height: "46vh", minHeight: 320, maxHeight: 440, background: "#0b0d11" }}>
        {/* photo layer — oversized + animated so it drifts continuously
            without ever needing scroll or mouse input, and always covers
            the frame however the container gets cropped */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${HERO_IMAGE_URL})`,
            backgroundSize: "cover",
            backgroundPosition: "center 32%",
            animation: "heroPhotoDrift 10s ease-in-out infinite",
          }}
        />

        {/* top fade — keeps the status bar / title legible against bright sky */}
        <div className="absolute inset-x-0 top-0" style={{ height: "45%", background: "linear-gradient(to bottom, rgba(10,12,16,0.85) 0%, rgba(10,12,16,0.15) 100%)" }} />
        {/* bottom fade — blends the photo seamlessly into the menu below */}
        <div className="absolute inset-x-0 bottom-0" style={{ height: "55%", background: `linear-gradient(to top, ${COLORS.bg} 0%, rgba(11,13,17,0.55) 55%, transparent 100%)` }} />

        {/* gold glow, pulsing gently, tying the photo into the accent color */}
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 60% 62%, rgba(227,164,39,0.35) 0%, transparent 50%)",
          animation: "heroGlowPulse 5s ease-in-out infinite",
          mixBlendMode: "screen",
        }} />

        {/* logo block */}
        <div className="relative z-10 flex flex-col items-center justify-end h-full pb-7 px-6 text-center">
          <div className="flex items-center gap-2 mb-2">
            <Flag size={17} style={{ color: COLORS.gold }} />
            <span className="text-[10px] tracking-[0.35em] uppercase" style={{ color: COLORS.muted }}>Temporada</span>
          </div>
          <h1 className="font-bold tracking-tight leading-none" style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "2.1rem", color: COLORS.text, textShadow: "0 2px 14px rgba(0,0,0,0.65)", animation: "heroTitleIn 0.6s ease-out both" }}>
            MOTORBIKE<br />
            <span style={{ color: COLORS.gold }}>MANAGER <span style={{ fontSize: "1.3rem" }}>2026</span></span>
          </h1>
          <p className="text-xs mt-3" style={{ color: COLORS.muted, letterSpacing: "0.03em" }}>Tu equipo. Tu visión. Tu leyenda.</p>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <CheckerStrip accent={COLORS.gold} />
        </div>
      </div>

      {/* MAIN MENU */}
      <div className="max-w-xl mx-auto px-5 pb-10">
        {!storageOk && (
          <div className="text-xs mt-4 rounded-xl px-3 py-2.5" style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}`, color: COLORS.danger }}>
            El guardado persistente no está disponible ahora mismo. Podés jugar igual, pero no vas a poder guardar ni cargar partidas hasta que vuelva a estar disponible.
          </div>
        )}

        <div className="space-y-4 mt-6">
          <HomeCard icon={Zap} title="Partida rápida" description="Compite inmediatamente eligiendo categoría y escudería." onClick={onQuick} delay={80} accent={COLORS.gold} />
          <HomeCard icon={Rocket} title="Modo Carrera" description="Empieza desde Moto3 y construye una leyenda." onClick={onCareer} delay={180} accent={COLORS.gold} />
          <HomeCard icon={FolderOpen} title="Cargar partida" description="Continúa cualquiera de tus tres partidas guardadas." onClick={onLoad} delay={280} accent={COLORS.gold} />
        </div>

        <p className="text-center text-[11px] mt-8" style={{ color: COLORS.muted, opacity: 0.6 }}>Motorbike Manager © 2026</p>
      </div>
    </div>
  );
}

