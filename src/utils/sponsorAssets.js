/**
 * Turns a sponsor's real name into a stable, filesystem-safe id — the
 * exact filename SponsorLogo.jsx looks for at
 * public/assets/sponsors/<id>.png. Deterministic and pure (same name
 * always produces the same id), so nothing needs to store or look up
 * a separately-assigned id anywhere: any sponsor object with a `.name`
 * can resolve its own logo on the fly.
 *
 * Lowercased, accents stripped, anything that isn't a-z/0-9 collapsed
 * into a single underscore. Checked against every sponsor name
 * currently in data/initialSponsors.js — all 72 produce unique ids,
 * see public/assets/sponsors/README.md for the full list.
 */
export function sponsorId(name) {
  if (!name) return null;
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
