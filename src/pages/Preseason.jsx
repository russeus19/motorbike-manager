import { AlertTriangle, FlaskConical } from "lucide-react";
import { BIKE_LABELS } from "../data/bikeAreas.js";
import { CIRCUITS, CIRCUIT_PROFILES } from "../data/circuits.js";
import { COLORS } from "../data/colors.js";
import { RiderPhoto } from "../components/RiderPhoto.jsx";
import { TeamNumberBadge } from "../components/TeamNumberBadge.jsx";

// Sepang, Jerez, Tailandia — must match App.jsx's PRESEASON_TEST_ROUNDS.
// With more prototypes than venues, these three simply repeat in a cycle.
const TEST_ROUNDS = [18, 3, 0];

const TONE_COLOR = { favorable: "#3F9142", desfavorable: "#D64545" };

export function PreseasonScreen({ preseasonState, accent, onTest, onDecide }) {
  const { prototypes, sessionIndex, perceivedGain, riderOpinions, classification, tested } = preseasonState;
  const round = TEST_ROUNDS[sessionIndex % TEST_ROUNDS.length];
  const circuit = CIRCUIT_PROFILES[round];
  const circuitName = CIRCUITS[round];
  const proto = prototypes[sessionIndex];
  const areaLabel = BIKE_LABELS[proto.area];

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <div className="text-xs uppercase tracking-[0.2em] mb-1" style={{ color: COLORS.muted }}>
        Pretemporada · Entrenamiento {sessionIndex + 1} de {prototypes.length}
      </div>
      <h2 className="text-2xl font-bold mb-1 flex items-center gap-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>
        <FlaskConical size={22} style={{ color: accent }} /> {circuitName}
      </h2>
      <p className="text-sm mb-6" style={{ color: COLORS.muted }}>{circuit.country} {circuit.flag}</p>

      <div className="rounded-lg p-5 mb-4" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
        {!tested && (
          <>
            <p className="text-sm mb-4" style={{ color: COLORS.text }}>
              Vais a probar la mejora investigada en <strong>{areaLabel}</strong> durante la temporada pasada.
            </p>
            <button onClick={onTest}
              className="w-full py-2.5 rounded-md font-bold flex items-center justify-center gap-2"
              style={{ background: accent, color: "#12151A", fontFamily: "Rajdhani, sans-serif" }}>
              Realizar el entrenamiento
            </button>
          </>
        )}

        {tested && (
          <>
            <p className="text-sm mb-2" style={{ color: COLORS.text }}>
              El test sugiere una mejora aproximada de <strong style={{ color: accent }}>+{perceivedGain}</strong> en <strong>{areaLabel}</strong>.
            </p>
            {proto.downsideArea && (
              <p className="text-sm mb-2" style={{ color: COLORS.danger }}>
                También se ha notado un perjuicio de <strong>-{proto.downsideAmount}</strong> en <strong>{BIKE_LABELS[proto.downsideArea]}</strong>.
              </p>
            )}
            <p className="text-xs mb-4" style={{ color: COLORS.muted }}>
              La mejora es solo una estimación con margen de error — cuanto mejor sea vuestra Fábrica y Staff, más fiable será esta lectura, pero nunca es exacta del todo.
            </p>

            {riderOpinions && riderOpinions.length > 0 && (
              <div className="space-y-2 mb-4">
                {riderOpinions.map(({ rider, tone, text }) => (
                  <div key={rider.id} className="flex items-center gap-3 rounded-md p-2.5" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                    <RiderPhoto rider={rider} size={40} className="rounded-lg flex-shrink-0" />
                    <p className="text-xs" style={{ color: TONE_COLOR[tone] || COLORS.muted }}>{text}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => onDecide(true)}
                className="flex-1 py-2.5 rounded-md font-bold" style={{ background: "#3F9142", color: "#fff" }}>
                Quedarnos con la pieza
              </button>
              <button onClick={() => onDecide(false)}
                className="flex-1 py-2.5 rounded-md font-bold" style={{ background: COLORS.panel2, color: COLORS.danger, border: `1px solid ${COLORS.danger}` }}>
                Descartarla
              </button>
            </div>
          </>
        )}
      </div>

      {tested && classification && (
        <>
          <div className="text-xs uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>Tiempos del entrenamiento</div>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: COLORS.rule, maxHeight: 340, overflowY: "auto" }}>
            {classification.map((r, i) => (
              <div key={r.id} className="flex items-start justify-between px-4 py-2.5 text-sm"
                style={{ background: i % 2 === 0 ? COLORS.panel : COLORS.panel2, borderBottom: `1px solid ${COLORS.rule}` }}>
                <div className="flex items-start gap-3 min-w-0">
                  <span className="w-6 text-right font-mono flex-shrink-0 pt-0.5" style={{ color: i < 3 && !r.crashed ? accent : COLORS.muted }}>{r.gridPosition}</span>
                  <TeamNumberBadge color={r.teamColor} number={r.number} riderId={r.photoId ?? r.id} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate" style={{ fontWeight: r.teamId === "player" ? 700 : 400 }}>{r.name}</span>
                      {r.crashed && <AlertTriangle size={13} style={{ color: COLORS.danger }} className="flex-shrink-0" />}
                    </div>
                    <div className="text-xs truncate" style={{ color: COLORS.muted }}>{r.teamName}</div>
                  </div>
                </div>
                <span className="font-mono text-xs flex-shrink-0 pt-0.5" style={{ color: r.crashed ? COLORS.danger : (i === 0 ? accent : COLORS.muted) }}>
                  {r.qualyTimeDisplay}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
