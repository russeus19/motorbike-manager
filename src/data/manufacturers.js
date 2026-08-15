/**
 * Real-world nationality (same flag-emoji convention `nat` already
 * uses for riders) and a stable, filesystem-safe id (for the
 * manufacturer's own logo — see ManufacturerLogo.jsx) for every
 * manufacturer/chassis brand that appears anywhere across the game's
 * 7 categories. Covers actual bike manufacturers (Ducati, Honda...)
 * as well as pure chassis brands used in the feeder classes (Kalex,
 * Boscoscuro, Forward) — from the game's own perspective both are
 * just "manufacturer", so both get an entry here the same way.
 */
export const MANUFACTURERS = {
  Ducati: { nat: "🇮🇹", id: "ducati" },
  Aprilia: { nat: "🇮🇹", id: "aprilia" },
  Yamaha: { nat: "🇯🇵", id: "yamaha" },
  Honda: { nat: "🇯🇵", id: "honda" },
  KTM: { nat: "🇦🇹", id: "ktm" },
  Kawasaki: { nat: "🇯🇵", id: "kawasaki" },
  Suzuki: { nat: "🇯🇵", id: "suzuki" },
  BMW: { nat: "🇩🇪", id: "bmw" },
  Triumph: { nat: "🇬🇧", id: "triumph" },
  "MV Agusta": { nat: "🇮🇹", id: "mv_agusta" },
  Kove: { nat: "🇨🇳", id: "kove" },
  Zxmoto: { nat: "🇨🇳", id: "zxmoto" },
  "QJ Motor": { nat: "🇨🇳", id: "qj_motor" },
  Kalex: { nat: "🇩🇪", id: "kalex" },
  Boscoscuro: { nat: "🇮🇹", id: "boscoscuro" },
  Forward: { nat: "🇮🇹", id: "forward" },
};

/** A manufacturer's own data, or a safe empty fallback if a name isn't
 * in the table above (shouldn't happen for any manufacturer actually
 * used in team data, but keeps a typo from ever throwing). */
export function manufacturerInfo(name) {
  return MANUFACTURERS[name] || { nat: null, id: null };
}
