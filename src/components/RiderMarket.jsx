import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, Search, Users } from "lucide-react";
import { CountryFlag } from "./CountryFlag.jsx";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { OverallBadge, Panel } from "./UIPrimitives.jsx";
import { CATEGORY_DATA, CATEGORY_ORDER } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { countryIdFromEmoji } from "../data/countryFlags.js";
import { isFreeAgentEligibleForCategory, lastTeamName, overallRating } from "../utils/riders.js";
import { teamDisplayName } from "../utils/teamNaming.js";

/** Nationality filter — a real dropdown of its own instead of a native
 * <select>, since a native <select>'s <option> elements can't render an
 * <img>. Shows the same CountryFlag images used everywhere else in the
 * game (RiderProfileModal included), never the raw emoji. */
function NationalityPicker({ value, options, accent }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = value.value === "all" ? "Todos" : (countryIdFromEmoji(value.value) || "").replace(/_/g, " ");
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-colors"
        style={{ background: COLORS.panel2, border: `1px solid ${open ? accent : COLORS.rule}`, color: COLORS.text }}>
        <span className="flex items-center gap-2 truncate capitalize">
          {value.value !== "all" && <CountryFlag nat={value.value} width={18} />}
          {selectedLabel}
        </span>
        <ChevronDown size={14} style={{ color: COLORS.muted, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute z-30 mt-1.5 w-full rounded-xl overflow-hidden" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, maxHeight: 240, overflowY: "auto", boxShadow: "0 12px 28px rgba(0,0,0,0.4)" }}>
            <button onClick={() => { value.onChange("all"); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm transition-colors" style={{ color: COLORS.text }}
              onMouseEnter={(e) => e.currentTarget.style.background = COLORS.panel}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              Todos
            </button>
            {options.map((nat) => (
              <button key={nat} onClick={() => { value.onChange(nat); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 capitalize transition-colors" style={{ color: COLORS.text }}
                onMouseEnter={(e) => e.currentTarget.style.background = COLORS.panel}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <CountryFlag nat={nat} width={18} /> <span className="truncate">{(countryIdFromEmoji(nat) || "").replace(/_/g, " ")}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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
          <span className="font-mono text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${accent}1F`, color: accent }}>{sorted.length}</span>
          {expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
        </span>
      }
    >
      {expanded && (
        sorted.length === 0 ? (
          <p className="text-sm" style={{ color: COLORS.muted }}>No hay pilotos libres elegibles ahora mismo para {CATEGORY_DATA[category].label}.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <style>{`
              @keyframes freeAgentCardIn {
                from { opacity: 0; transform: translateY(12px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            {sorted.map((r, i) => (
              <button key={r.id} onClick={() => openProfile(r, "Agente libre", null)}
                className="relative text-left rounded-2xl border p-3.5 transition-transform duration-150 active:scale-[0.98] hover:scale-[1.012] group"
                style={{ background: COLORS.panel2, borderColor: COLORS.rule, animation: "freeAgentCardIn 0.4s ease-out both", animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <div className="flex items-center gap-2.5 mb-2">
                  <RiderPhoto rider={r} size={44} shape="circle" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                      {r.nat && <CountryFlag nat={r.nat} width={15} />}
                      {r.name}
                      <OverallBadge value={overallRating(r)} accent={accent} />
                    </div>
                    <div className="text-xs truncate mt-0.5" style={{ color: COLORS.muted }}>{r.age} años · PA {r.pa} · antes en {lastTeamName(r)}</div>
                  </div>
                </div>
                <div className="text-xs font-mono" style={{ color: COLORS.muted }}>Valor: <span style={{ color: COLORS.text }}>€{(r.marketValue || 0).toLocaleString()}</span></div>

                <div className="absolute top-3 right-3 flex items-center justify-center rounded-full transition-transform duration-150 group-hover:translate-x-0.5" style={{ width: 24, height: 24, border: `1px solid ${accent}` }}>
                  <ChevronRight size={12} style={{ color: accent }} />
                </div>
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
  const [categoryFilter, setCategoryFilter] = useState("all"); // all | <cada key de CATEGORY_ORDER> | free
  const [natFilter, setNatFilter] = useState("all"); // all | emoji de bandera del piloto (r.nat)
  const [genderFilter, setGenderFilter] = useState("all"); // all | M | F
  const [minAge, setMinAge] = useState(14);
  const [maxAge, setMaxAge] = useState(45);
  const [minCA, setMinCA] = useState(0);
  const [maxCA, setMaxCA] = useState(100);
  const [minPA, setMinPA] = useState(0);
  const [maxPA, setMaxPA] = useState(100);

  function teamEntries(t, categoryKey) {
    return [
      ...t.riders.map((r) => ({ rider: r, teamName: teamDisplayName(t), categoryKey })),
      ...Object.values(t.substitutes || {}).map((r) => ({ rider: r, teamName: teamDisplayName(t), categoryKey })),
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

  // Every nationality actually present in the current search pool, so the
  // dropdown never shows a country with zero riders in it. Sorted by
  // display name (via countryIdFromEmoji) rather than by emoji, which
  // sorts arbitrarily and unhelpfully.
  const availableNats = [...new Set(allEntries.map((e) => e.rider.nat).filter(Boolean))]
    .sort((a, b) => (countryIdFromEmoji(a) || "").localeCompare(countryIdFromEmoji(b) || ""));

  const filtered = allEntries.filter((e) => {
    if (contractFilter === "contracted" && !e.teamName) return false;
    if (contractFilter === "free" && e.teamName) return false;
    if (categoryFilter === "free" && e.teamName) return false;
    if (CATEGORY_ORDER.includes(categoryFilter) && e.categoryKey !== categoryFilter) return false;
    const r = e.rider;
    if (natFilter !== "all" && r.nat !== natFilter) return false;
    if (genderFilter !== "all" && (r.gender || "M") !== genderFilter) return false;
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
      <div className="flex items-center gap-2 mb-3 rounded-xl px-3 py-2.5 transition-colors" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
        <Search size={14} style={{ color: COLORS.muted }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, escudería o nacionalidad…"
          className="flex-1 bg-transparent outline-none text-sm" style={{ color: COLORS.text }} />
      </div>

      <button onClick={() => setFiltersOpen((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold mb-3 px-1 py-1 rounded-lg transition-colors"
        style={{ color: COLORS.muted }}>
        <span>Filtros</span>
        {filtersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {filtersOpen && (
        <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(255,255,255,0.015)", border: `1px solid ${COLORS.rule}` }}>
          <label className="flex flex-col gap-1.5 mb-3 text-xs" style={{ color: COLORS.muted }}>Categoría
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }}>
              <option value="all">Todas</option>
              {CATEGORY_ORDER.map((ck) => (
                <option key={ck} value={ck}>{CATEGORY_DATA[ck].label}</option>
              ))}
              <option value="free">Pilotos libres</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 mb-3 text-xs" style={{ color: COLORS.muted }}>País de procedencia
            <NationalityPicker value={{ value: natFilter, onChange: setNatFilter }} options={availableNats} accent={accent} />
          </label>
          <label className="flex flex-col gap-1.5 mb-3 text-xs" style={{ color: COLORS.muted }}>Sexo
            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }}>
              <option value="all">Todos</option>
              <option value="M">Hombre</option>
              <option value="F">Mujer</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 mb-3 text-xs" style={{ color: COLORS.muted }}>Estado del contrato
            <select value={contractFilter} onChange={(e) => setContractFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }}>
              <option value="all">Todos</option>
              <option value="contracted">Con contrato</option>
              <option value="free">Sin contrato (Pilotos libres)</option>
            </select>
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>Edad mín.
              <input type="number" value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} className="px-2 py-1.5 rounded-lg" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
            </label>
            <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>Edad máx.
              <input type="number" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} className="px-2 py-1.5 rounded-lg" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
            </label>
            <div />
            <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>CA mín.
              <input type="number" value={minCA} onChange={(e) => setMinCA(Number(e.target.value))} className="px-2 py-1.5 rounded-lg" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
            </label>
            <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>CA máx.
              <input type="number" value={maxCA} onChange={(e) => setMaxCA(Number(e.target.value))} className="px-2 py-1.5 rounded-lg" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
            </label>
            <div />
            <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>PA mín.
              <input type="number" value={minPA} onChange={(e) => setMinPA(Number(e.target.value))} className="px-2 py-1.5 rounded-lg" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
            </label>
            <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>PA máx.
              <input type="number" value={maxPA} onChange={(e) => setMaxPA(Number(e.target.value))} className="px-2 py-1.5 rounded-lg" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
            </label>
          </div>
        </div>
      )}

      <div className="space-y-2" style={{ maxHeight: 340, overflowY: "auto" }}>
        {filtered.map((e) => (
          <button key={e.rider.id} onClick={() => openProfile(e.rider, e.teamName || "Agente libre", e.teamName ? e.categoryKey : null)}
            className="w-full text-left flex items-center justify-between rounded-xl px-3 py-2.5 transition-transform duration-150 active:scale-[0.98] hover:scale-[1.006]"
            style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
            <span className="flex items-center gap-2.5 text-sm min-w-0">
              <RiderPhoto rider={e.rider} size={38} shape="circle" />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 truncate">
                  {e.rider.nat && <CountryFlag nat={e.rider.nat} width={16} />}
                  {e.rider.name} <OverallBadge value={overallRating(e.rider)} accent={accent} />
                </span>
                <span className="block text-xs truncate mt-0.5" style={{ color: COLORS.muted }}>
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

