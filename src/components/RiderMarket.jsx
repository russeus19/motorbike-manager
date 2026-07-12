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


/**
 * General rider search — covers every rider in the game: all three
 * categories (your team, every rival, and every team in the other two
 * categories) plus every free agent, not just the current category's
 * free agents. The "Categoría" and "Estado del contrato" filters decide
 * which of those show up; everything else (name/team/nationality
 * search, age, CA, PA) is exactly the same filtering logic as before,
 * just applied over the wider list.
 *
 * Eligibility for actually signing/substituting a free agent (age <= 27
 * for Moto3, age <= 30 for Moto2, no limit for MotoGP — see
 * isFreeAgentEligibleForCategory) is intentionally NOT applied here —
 * this panel is for browsing/searching, so an ineligible free agent can
 * still be found and viewed even though they can't be fielded in that
 * category. That restriction is enforced where it matters: the sign
 * button in the rider profile and the substitute-selection screen.
 */
export function AdvancedFreeAgentSearch({ freeAgents, playerTeam, rivalTeams, otherCategories, category, accent, openProfile }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contractFilter, setContractFilter] = useState("all"); // all | contracted | free
  const [categoryFilter, setCategoryFilter] = useState("all"); // all | motogp | moto2 | moto3 | free
  const [minAge, setMinAge] = useState(14);
  const [maxAge, setMaxAge] = useState(45);
  const [minCA, setMinCA] = useState(0);
  const [maxCA, setMaxCA] = useState(100);
  const [minPA, setMinPA] = useState(0);
  const [maxPA, setMaxPA] = useState(100);

  function teamEntries(t, categoryKey) {
    return [
      ...t.riders.map((r) => ({ rider: r, teamName: t.name, categoryKey })),
      ...Object.values(t.substitutes || {}).map((r) => ({ rider: r, teamName: t.name, categoryKey })),
    ];
  }

  const currentCategoryEntries = [
    ...teamEntries(playerTeam, category),
    ...rivalTeams.flatMap((t) => teamEntries(t, category)),
  ];
  const otherCategoryEntries = Object.entries(otherCategories || {}).flatMap(([key, catState]) =>
    (catState.teams || []).flatMap((t) => teamEntries(t, key))
  );
  const freeAgentEntries = freeAgents.map((r) => ({ rider: r, teamName: null, categoryKey: null }));
  const allEntries = [...currentCategoryEntries, ...otherCategoryEntries, ...freeAgentEntries];

  const filtered = allEntries.filter((e) => {
    if (contractFilter === "contracted" && !e.teamName) return false;
    if (contractFilter === "free" && e.teamName) return false;
    if (categoryFilter === "free" && e.teamName) return false;
    if (["motogp", "moto2", "moto3"].includes(categoryFilter) && e.categoryKey !== categoryFilter) return false;
    const r = e.rider;
    const ca = overallRating(r);
    if (r.age < minAge || r.age > maxAge) return false;
    if (ca < minCA || ca > maxCA) return false;
    if (r.pa < minPA || r.pa > maxPA) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const teamNameForSearch = e.teamName || lastTeamName(r);
      if (!r.name.toLowerCase().includes(q) && !teamNameForSearch.toLowerCase().includes(q) && !(r.nat || "").includes(q)) return false;
    }
    return true;
  }).sort((a, b) => overallRating(b.rider) - overallRating(a.rider));

  return (
    <Panel title="Buscador avanzado de pilotos" icon={Search} accent={accent}>
      <div className="flex items-center gap-2 mb-3 rounded-md px-3 py-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
        <Search size={14} style={{ color: COLORS.muted }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, escudería o nacionalidad…"
          className="flex-1 bg-transparent outline-none text-sm" style={{ color: COLORS.text }} />
      </div>

      <button onClick={() => setFiltersOpen((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold mb-3 px-1"
        style={{ color: COLORS.muted }}>
        <span>Filtros</span>
        {filtersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {filtersOpen && (
        <>
          <label className="flex flex-col gap-1 mb-3 text-xs" style={{ color: COLORS.muted }}>Categoría
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2 py-1.5 rounded" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }}>
              <option value="all">Todas</option>
              <option value="motogp">MotoGP</option>
              <option value="moto2">Moto2</option>
              <option value="moto3">Moto3</option>
              <option value="free">Pilotos libres</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 mb-3 text-xs" style={{ color: COLORS.muted }}>Estado del contrato
            <select value={contractFilter} onChange={(e) => setContractFilter(e.target.value)}
              className="px-2 py-1.5 rounded" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }}>
              <option value="all">Todos</option>
              <option value="contracted">Con contrato</option>
              <option value="free">Sin contrato (Pilotos libres)</option>
            </select>
          </label>
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
        </>
      )}

      <div className="space-y-2" style={{ maxHeight: 320, overflowY: "auto" }}>
        {filtered.map((e) => (
          <button key={e.rider.id} onClick={() => openProfile(e.rider, e.teamName || "Agente libre", e.teamName ? e.categoryKey : null)}
            className="w-full text-left flex items-center justify-between rounded-md px-3 py-2"
            style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
            <span className="flex items-center gap-2 text-sm min-w-0">
              <RiderPhoto rider={e.rider} size={28} className="rounded" />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 truncate">{e.rider.name} <OverallBadge value={overallRating(e.rider)} accent={accent} /></span>
                <span className="block text-xs truncate" style={{ color: COLORS.muted }}>
                  {e.teamName || "Agente libre"}{e.categoryKey ? ` · ${CATEGORY_DATA[e.categoryKey]?.label}` : ""}
                </span>
              </span>
            </span>
            <span className="text-xs font-mono flex-shrink-0 ml-2" style={{ color: COLORS.muted }}>PA {e.rider.pa} · {e.rider.age}a</span>
          </button>
        ))}
        {filtered.length === 0 && <p className="text-sm" style={{ color: COLORS.muted }}>Ningún piloto coincide con la búsqueda/filtros.</p>}
      </div>
    </Panel>
  );
}

