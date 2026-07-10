import { useState } from "react";
import { ChevronDown, ChevronUp, Search, Users } from "lucide-react";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { OverallBadge, Panel } from "./UIPrimitives.jsx";
import { CATEGORY_DATA } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { isFreeAgentEligibleForCategory, lastTeamName, overallRating } from "../utils/riders.js";

export function FreeAgentsPanel({ freeAgents, category, accent, openProfile }) {
  const [expanded, setExpanded] = useState(false);
  const eligible = freeAgents.filter((r) => isFreeAgentEligibleForCategory(r, category));
  const sorted = [...eligible].sort((a, b) => overallRating(b) - overallRating(a));

  return (
    <Panel
      title="Pilotos libres"
      icon={Users}
      accent={accent}
      onHeaderClick={() => setExpanded((v) => !v)}
      headerRight={
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color: COLORS.muted }}>{sorted.length}</span>
          {expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
        </span>
      }
    >
      {expanded && (
        sorted.length === 0 ? (
          <p className="text-sm" style={{ color: COLORS.muted }}>No hay pilotos libres elegibles ahora mismo para {CATEGORY_DATA[category].label}.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {sorted.map((r) => (
              <button key={r.id} onClick={() => openProfile(r, "Agente libre", null)}
                className="text-left rounded-lg border p-3"
                style={{ background: COLORS.panel2, borderColor: COLORS.rule }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <RiderPhoto rider={r} size={32} className="rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate flex items-center gap-1.5">{r.name} <OverallBadge value={overallRating(r)} accent={accent} /></div>
                    <div className="text-xs truncate" style={{ color: COLORS.muted }}>{r.age} años · PA {r.pa} · antes en {lastTeamName(r)}</div>
                  </div>
                </div>
                <div className="text-xs font-mono" style={{ color: COLORS.muted }}>Valor: €{(r.marketValue || 0).toLocaleString()}</div>
              </button>
            ))}
          </div>
        )
      )}
    </Panel>
  );
}


export function AdvancedFreeAgentSearch({ freeAgents, category, accent, openProfile }) {
  const [search, setSearch] = useState("");
  const [minAge, setMinAge] = useState(14);
  const [maxAge, setMaxAge] = useState(45);
  const [minCA, setMinCA] = useState(0);
  const [maxCA, setMaxCA] = useState(100);
  const [minPA, setMinPA] = useState(0);
  const [maxPA, setMaxPA] = useState(100);

  const eligible = freeAgents.filter((r) => isFreeAgentEligibleForCategory(r, category));
  const filtered = eligible.filter((r) => {
    const ca = overallRating(r);
    if (r.age < minAge || r.age > maxAge) return false;
    if (ca < minCA || ca > maxCA) return false;
    if (r.pa < minPA || r.pa > maxPA) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!r.name.toLowerCase().includes(q) && !lastTeamName(r).toLowerCase().includes(q) && !(r.nat || "").includes(q)) return false;
    }
    return true;
  }).sort((a, b) => overallRating(b) - overallRating(a));

  return (
    <Panel title="Buscador avanzado de pilotos libres" icon={Search} accent={accent}>
      <div className="flex items-center gap-2 mb-3 rounded-md px-3 py-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
        <Search size={14} style={{ color: COLORS.muted }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, escudería o nacionalidad…"
          className="flex-1 bg-transparent outline-none text-sm" style={{ color: COLORS.text }} />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>Edad mín.
          <input type="number" value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} className="px-2 py-1 rounded" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
        </label>
        <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>Edad máx.
          <input type="number" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} className="px-2 py-1 rounded" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
        </label>
        <div />
        <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>CA mín.
          <input type="number" value={minCA} onChange={(e) => setMinCA(Number(e.target.value))} className="px-2 py-1 rounded" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
        </label>
        <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>CA máx.
          <input type="number" value={maxCA} onChange={(e) => setMaxCA(Number(e.target.value))} className="px-2 py-1 rounded" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
        </label>
        <div />
        <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>PA mín.
          <input type="number" value={minPA} onChange={(e) => setMinPA(Number(e.target.value))} className="px-2 py-1 rounded" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
        </label>
        <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>PA máx.
          <input type="number" value={maxPA} onChange={(e) => setMaxPA(Number(e.target.value))} className="px-2 py-1 rounded" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
        </label>
      </div>
      <div className="space-y-2" style={{ maxHeight: 320, overflowY: "auto" }}>
        {filtered.map((r) => (
          <button key={r.id} onClick={() => openProfile(r, "Agente libre", null)}
            className="w-full text-left flex items-center justify-between rounded-md px-3 py-2"
            style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
            <span className="flex items-center gap-2 text-sm min-w-0">
              <RiderPhoto rider={r} size={28} className="rounded" />
              <span className="truncate">{r.name}</span>
              <OverallBadge value={overallRating(r)} accent={accent} />
            </span>
            <span className="text-xs font-mono flex-shrink-0 ml-2" style={{ color: COLORS.muted }}>PA {r.pa} · {r.age}a</span>
          </button>
        ))}
        {filtered.length === 0 && <p className="text-sm" style={{ color: COLORS.muted }}>Ningún piloto libre coincide con la búsqueda/filtros.</p>}
      </div>
    </Panel>
  );
}

