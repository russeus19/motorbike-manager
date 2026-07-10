import { useState } from "react";
import { ArrowLeftRight, ChevronRight, Lock, Search } from "lucide-react";
import { AttrGrid, OverallBadge, RiderNameButton } from "../components/UIPrimitives.jsx";
import { CATEGORY_DATA } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { overallRating } from "../utils/riders.js";

export function MarketScreen({ playerTeam, marketData, budget, category, onConfirm, openProfile }) {
  const { position, cap, transferBudget, marketRiders, freeAgentRiders, departures } = marketData;
  const accent = playerTeam.color;
  const lowerLabel = CATEGORY_DATA[category].lower ? CATEGORY_DATA[CATEGORY_DATA[category].lower].label : null;

  const departedRiders = playerTeam.riders.filter((r) => departures?.[r.id]?.success);
  const availableOwn = playerTeam.riders.filter((r) => !departures?.[r.id]?.success);

  const ownEntries = availableOwn.map((r) => ({
    key: `own-${r.id}`, origin: "own", rider: r, cost: 0,
    tag: departures?.[r.id] && !departures[r.id].success ? "Quería ascender pero no encontró hueco (moral resentida)" : "Tu plantilla actual",
    teamName: playerTeam.name,
  }));
  const marketEntries = marketRiders.map((m) => ({
    key: `mkt-${m.rider.id}`, origin: m.origin, rider: m.rider, cost: m.cost, fromTeamId: m.fromTeamId,
    tag: m.origin === "lower" ? `Ascenso desde ${lowerLabel}: ${m.fromTeamName}` : `Disponible: ${m.fromTeamName}`,
    teamName: m.fromTeamName,
  }));
  const freeAgentEntries = freeAgentRiders.map((m) => ({ key: `fa-${m.rider.id}`, origin: "freeagent", rider: m.rider, cost: m.cost, tag: "Agente libre", teamName: "Agente libre" }));

  const [selectedKeys, setSelectedKeys] = useState(ownEntries.map((e) => e.key));
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [maxRating, setMaxRating] = useState(100);
  const [minAge, setMinAge] = useState(14);
  const [maxAge, setMaxAge] = useState(45);

  function toggle(key) {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 2) return prev;
      return [...prev, key];
    });
  }

  const searchable = [...marketEntries, ...freeAgentEntries].filter((e) => {
    const rating = overallRating(e.rider);
    if (rating < minRating || rating > maxRating) return false;
    if (e.rider.age < minAge || e.rider.age > maxAge) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!e.rider.name.toLowerCase().includes(q) && !e.teamName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const allEntries = [...ownEntries, ...searchable];
  // Selections might reference own-riders excluded by an active filter; keep those valid regardless.
  const fullSelected = [...ownEntries, ...marketEntries, ...freeAgentEntries].filter((e) => selectedKeys.includes(e.key));
  const spend = fullSelected.reduce((s, e) => s + e.cost, 0);
  const effectiveBudget = Math.min(transferBudget, budget);
  const over = spend > effectiveBudget;
  const canConfirm = fullSelected.length === 2 && !over;

  const capLabel = cap >= 99 ? "sin límite: acceso a cualquier piloto" : `hasta valoración ${cap}`;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-1">
        <ArrowLeftRight size={20} style={{ color: accent }} />
        <span className="text-xs tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>Mercado de fichajes · {CATEGORY_DATA[category].label}</span>
      </div>
      <h2 className="text-3xl font-bold mb-1" style={{ fontFamily: "Rajdhani, sans-serif" }}>{playerTeam.name}</h2>
      <p className="text-sm mb-3" style={{ color: COLORS.muted }}>
        Terminaste {position}º en constructores: tu alcance de fichaje es {capLabel}.{lowerLabel ? ` Podés ascender talento de ${lowerLabel} si entra en tu presupuesto y valoración máxima.` : ""} Los agentes libres están siempre disponibles; sin equipo evolucionan mucho más despacio, pero nunca dejan de hacerlo del todo.
      </p>

      {departedRiders.length > 0 && (
        <div className="mb-4 rounded-md p-3 text-sm" style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}` }}>
          {departedRiders.map((r) => (
            <div key={r.id}>{r.name} decidió ascender de categoría y deja el equipo esta temporada.</div>
          ))}
        </div>
      )}

      <div className="rounded-md px-4 py-2 mb-4 flex justify-between items-center" style={{ background: over ? "rgba(214,69,69,0.15)" : COLORS.panel2, border: `1px solid ${over ? COLORS.danger : COLORS.rule}` }}>
        <span className="text-sm">Presupuesto de fichajes</span>
        <span className="font-mono" style={{ color: over ? COLORS.danger : COLORS.text }}>€{spend.toLocaleString()} / €{effectiveBudget.toLocaleString()}</span>
      </div>

      <div className="rounded-lg border p-3 mb-4" style={{ background: COLORS.panel, borderColor: COLORS.rule }}>
        <div className="flex items-center gap-2 mb-2">
          <Search size={14} style={{ color: COLORS.muted }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar piloto o escudería…"
            className="flex-1 bg-transparent outline-none text-sm" style={{ color: COLORS.text }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>Media mín.
            <input type="number" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className="px-2 py-1 rounded" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
          </label>
          <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>Media máx.
            <input type="number" value={maxRating} onChange={(e) => setMaxRating(Number(e.target.value))} className="px-2 py-1 rounded" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
          </label>
          <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>Edad mín.
            <input type="number" value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} className="px-2 py-1 rounded" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
          </label>
          <label className="flex flex-col gap-1" style={{ color: COLORS.muted }}>Edad máx.
            <input type="number" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} className="px-2 py-1 rounded" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }} />
          </label>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {allEntries.map((e) => {
          const selected = selectedKeys.includes(e.key);
          const rating = overallRating(e.rider);
          const lockedByCap = e.origin === "market" && rating > cap;
          const entryCategory = e.origin === "lower" ? CATEGORY_DATA[category].lower : category;
          return (
            <div key={e.key}
              className="text-left rounded-lg border p-3 transition"
              style={{ background: selected ? COLORS.panel2 : COLORS.panel, borderColor: selected ? accent : COLORS.rule, opacity: lockedByCap ? 0.4 : 1 }}>
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold flex items-center gap-1.5" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                  <RiderNameButton rider={e.rider} onClick={() => openProfile(e.rider, e.teamName, entryCategory)} />
                  <OverallBadge value={rating} accent={accent} />
                </span>
                <span className="text-xs font-mono" style={{ color: e.cost === 0 ? COLORS.gold : COLORS.muted }}>{e.cost === 0 ? "Gratis" : `€${e.cost.toLocaleString()}`}</span>
              </div>
              <div className="text-xs mb-2 flex items-center gap-1" style={{ color: COLORS.muted }}>
                {lockedByCap && <Lock size={11} />} {e.tag} · {e.rider.age} años · PA {e.rider.pa}
              </div>
              <AttrGrid rider={e.rider} accent={accent} />
              <button disabled={lockedByCap} onClick={() => toggle(e.key)}
                className="mt-2 text-xs px-2 py-1 rounded disabled:opacity-30 w-full"
                style={{ background: selected ? accent : COLORS.panel2, color: selected ? "#12151A" : COLORS.text, border: `1px solid ${COLORS.rule}` }}>
                {selected ? "Seleccionado" : "Elegir"}
              </button>
            </div>
          );
        })}
        {searchable.length === 0 && (
          <p className="text-sm col-span-2" style={{ color: COLORS.muted }}>Ningún piloto coincide con la búsqueda/filtros.</p>
        )}
      </div>

      <button disabled={!canConfirm} onClick={() => onConfirm(fullSelected)}
        className="w-full py-3 rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
        style={{ background: accent, color: "#12151A", fontFamily: "Rajdhani, sans-serif" }}>
        Confirmar alineación y empezar la siguiente temporada <ChevronRight size={18} />
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Market Summary Screen — Football Manager style end-of-window report    */
/* ---------------------------------------------------------------------- */

