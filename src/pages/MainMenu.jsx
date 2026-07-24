import { useState } from "react";
import { ChevronRight, FlagTriangleRight, FolderOpen, Map, Newspaper, Rocket, Trophy, Users, Zap } from "lucide-react";
import { COLORS } from "../data/colors.js";

/* Hero photo for the home screen. Drop the image file at this path in the
   project's `public` folder (already included at public/assets/hero-bike.png). */
const HERO_IMAGE_URL = "/assets/hero-bike.png";
const QUICK_CARD_IMAGE_URL = "/assets/quick-bg.png";
const CAREER_CARD_IMAGE_URL = "/assets/career-bg.png";
const LOAD_CARD_IMAGE_URL = "/assets/load-bg.png";

function HomeCard({ icon: Icon, title, description, onClick, delay, imageUrl, focalPosition }) {
  return (
    <button
      onClick={onClick}
      className="relative w-full text-left rounded-2xl overflow-hidden transition-transform duration-150 active:scale-[0.97] hover:scale-[1.015] group"
      style={{
        height: 232,
        border: `1px solid ${COLORS.rule}`,
        boxShadow: "0 10px 26px rgba(0,0,0,0.38)",
        animation: "homeCardIn 0.55s ease-out both",
        animationDelay: `${delay}ms`,
      }}
    >
      {/* moody photo backdrop, cropped differently per card so all three
          feel distinct without needing three separate assets */}
      <div className="absolute inset-0" style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: focalPosition, filter: "saturate(0.85)" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(11,13,17,0.55) 0%, rgba(11,13,17,0.82) 62%, rgba(11,13,17,0.95) 100%)" }} />

      <div className="relative z-10 h-full flex flex-col justify-between p-5">
        <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 46, height: 46, background: "rgba(227,164,39,0.12)", border: `1px solid ${COLORS.gold}` }}>
          <Icon size={22} style={{ color: COLORS.gold }} />
        </div>
        <div>
          <div className="text-base font-bold tracking-wide uppercase mb-1.5" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{title}</div>
          <div className="text-sm leading-snug pr-6" style={{ color: COLORS.muted }}>{description}</div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-10 flex items-center justify-center rounded-full transition-transform duration-150 group-hover:translate-x-0.5" style={{ width: 34, height: 34, border: `1px solid ${COLORS.gold}` }}>
        <ChevronRight size={17} style={{ color: COLORS.gold }} />
      </div>
    </button>
  );
}

function StatItem({ icon: Icon, value, label, showDivider }) {
  return (
    <div className="flex items-center gap-3 px-6 py-1" style={{ borderLeft: showDivider ? `1px solid ${COLORS.rule}` : "none" }}>
      <Icon size={22} style={{ color: COLORS.gold }} />
      <div>
        <div className="text-xl font-bold leading-none" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{value}</div>
        <div className="text-[11px] uppercase tracking-wide mt-1" style={{ color: COLORS.muted }}>{label}</div>
      </div>
    </div>
  );
}

export function HomeScreen({ onQuick, onCareer, onLoad, storageOk }) {
  const [showNewsHint, setShowNewsHint] = useState(false);

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.bg }}>
      <style>{`
        @keyframes homeCardIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroTitleIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroPhotoIn {
          from { opacity: 0; transform: scale(1.05); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {!storageOk && (
        <div className="max-w-[1240px] mx-auto px-6 md:px-10 pt-4">
          <div className="text-xs rounded-xl px-3 py-2.5" style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}`, color: COLORS.danger }}>
            El guardado persistente no está disponible ahora mismo. Podés jugar igual, pero no vas a poder guardar ni cargar partidas hasta que vuelva a estar disponible.
          </div>
        </div>
      )}

      {/* HERO — full-bleed photo, text overlaid directly on top */}
      <div className="relative w-full overflow-hidden" style={{ height: "min(64vh, 560px)", minHeight: 360, animation: "heroPhotoIn 0.8s ease-out both" }}>
        <div className="absolute inset-0" style={{ backgroundImage: `url(${HERO_IMAGE_URL})`, backgroundSize: "cover", backgroundPosition: "center 42%" }} />

        {/* left-to-right dark fade so the overlaid text stays legible against the bright sky/track */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(11,13,17,0.92) 0%, rgba(11,13,17,0.6) 32%, rgba(11,13,17,0.05) 60%, transparent 78%)" }} />
        {/* bottom fade, blending the photo into the page background below */}
        <div className="absolute inset-x-0 bottom-0" style={{ height: "45%", background: `linear-gradient(to top, ${COLORS.bg} 0%, transparent 100%)` }} />

        {/* TOP BAR — overlaid directly on the photo, no background of its own */}
        <div className="absolute top-0 inset-x-0 z-20 max-w-[1240px] mx-auto px-6 md:px-10 pt-5 flex items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg font-black" style={{ width: 46, height: 46, background: COLORS.gold, color: "#12151A", fontFamily: "Rajdhani, sans-serif", fontSize: "1.35rem", boxShadow: "0 2px 10px rgba(0,0,0,0.45)" }}>MM</div>
            <div className="leading-none">
              <div className="text-lg font-bold tracking-tight" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text, textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>MOTORBIKE</div>
              <div className="text-lg font-bold tracking-tight -mt-1" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text, textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>MANAGER</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 h-full max-w-[1240px] mx-auto px-6 md:px-10 flex items-center">
          <div className="max-w-lg">
            <div className="inline-flex items-center rounded-full px-3.5 py-1.5 mb-5" style={{ border: `1px solid ${COLORS.rule}`, background: "rgba(11,13,17,0.4)", backdropFilter: "blur(3px)" }}>
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>Tu equipo. Tu visión. Tu leyenda.</span>
            </div>
            <h1 className="font-bold leading-[0.95] tracking-tight" style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "3.4rem", color: COLORS.text, textShadow: "0 2px 20px rgba(0,0,0,0.6)", animation: "heroTitleIn 0.6s ease-out both" }}>
              MOTORBIKE<br />
              <span style={{ color: COLORS.gold, fontStyle: "italic" }}>MANAGER</span>
            </h1>
            <p className="text-sm mt-5 leading-relaxed" style={{ color: COLORS.text, textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}>
              Gestiona tu equipo real de MotoGP, Moto2, Moto3, WorldSBK o WorldSSP.<br />
              Ficha, asciende, desarrolla la moto.<br />
              Escribe tu historia en la pista.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-6 md:px-10 pb-12">
        {/* CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 -mt-16 relative z-10">
          <HomeCard icon={Zap} title="Partida rápida" description="Compite inmediatamente eligiendo categoría y escudería." onClick={onQuick} delay={80} imageUrl={QUICK_CARD_IMAGE_URL} focalPosition="center 42%" />
          <HomeCard icon={Rocket} title="Modo carrera" description="Empieza desde Moto3 y construye una leyenda." onClick={onCareer} delay={180} imageUrl={CAREER_CARD_IMAGE_URL} focalPosition="center 20%" />
          <HomeCard icon={FolderOpen} title="Cargar partida" description="Continúa cualquiera de tus tres partidas guardadas." onClick={onLoad} delay={280} imageUrl={LOAD_CARD_IMAGE_URL} focalPosition="center 35%" />
        </div>

        {/* STATS */}
        <div className="flex flex-wrap justify-center sm:justify-between gap-y-4 rounded-2xl mt-8 px-6 py-5" style={{ border: `1px solid ${COLORS.rule}`, background: "rgba(255,255,255,0.015)" }}>
          <StatItem icon={Trophy} value="5" label="Categorías" />
          <StatItem icon={Map} value="22+" label="Circuitos" showDivider />
          <StatItem icon={Users} value="120+" label="Pilotos" showDivider />
          <StatItem icon={FlagTriangleRight} value="100%" label="Pasión" showDivider />
        </div>

        {/* FOOTER */}
        <div className="text-center mt-8">
          <p className="text-[11px]" style={{ color: COLORS.muted, opacity: 0.7 }}>Motorbike Manager © 2026</p>
          <p className="text-[11px] mt-0.5" style={{ color: COLORS.muted, opacity: 0.5 }}>No afiliado a Dorna Sports S.L.</p>
        </div>
      </div>

      {/* Noticias — fixed, thumb-reachable on mobile */}
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={() => setShowNewsHint((v) => !v)}
          className="relative flex items-center justify-center rounded-full transition-transform active:scale-90"
          style={{ width: 44, height: 44, background: "rgba(27,31,38,0.75)", border: `1px solid ${COLORS.rule}`, backdropFilter: "blur(6px)" }}
          aria-label="Noticias"
        >
          <Newspaper size={19} style={{ color: COLORS.text }} />
          <span className="absolute rounded-full" style={{ top: 8, right: 8, width: 7, height: 7, background: COLORS.gold }} />
        </button>
        {showNewsHint && (
          <div className="mb-2 absolute bottom-full left-0 text-xs px-3 py-2 rounded-lg whitespace-nowrap" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.muted, animation: "homeCardIn 0.2s ease-out both" }}>
            Noticias — próximamente
          </div>
        )}
      </div>
    </div>
  );
}
