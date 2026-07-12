/**
 * Turns rider/team names inside a plain string into clickable segments,
 * automatically — nothing about a rumor (or any future news item) needs
 * to be manually tagged with which words are links. Works on ANY text
 * as long as it's built from the game's own rider/team names, which is
 * true for every rumor, every negotiation headline, and anything future
 * news systems produce the same way, so nothing here needs to change
 * when new kinds of news get added later.
 */

/** Builds the flat list of "things a piece of news might mention" from
 * the current game state — every rider (titular, substitute, free
 * agent) and every team across all three categories, each tagged with
 * enough context (id + category) to open the right profile. Call once
 * per render of whatever's showing the news text; the list is small
 * (a season's worth of riders/teams) so this is cheap. */
export function buildNewsEntities({ playerTeam, rivalTeams, otherCategories, freeAgents, category }) {
  const entities = [];
  const seenTeams = new Set();
  const addTeamAndRiders = (team, categoryKey) => {
    if (!team) return;
    if (!seenTeams.has(team.id)) {
      entities.push({ type: "team", name: team.name, teamId: team.id, categoryKey });
      seenTeams.add(team.id);
    }
    (team.riders || []).forEach((r) => entities.push({ type: "rider", name: r.name, riderId: r.id, categoryKey }));
    Object.values(team.substitutes || {}).forEach((r) => entities.push({ type: "rider", name: r.name, riderId: r.id, categoryKey }));
  };

  if (playerTeam) addTeamAndRiders(playerTeam, category);
  (rivalTeams || []).forEach((t) => addTeamAndRiders(t, category));
  Object.entries(otherCategories || {}).forEach(([k, catState]) => {
    (catState?.teams || []).forEach((t) => addTeamAndRiders(t, k));
  });
  (freeAgents || []).forEach((r) => entities.push({ type: "rider", name: r.name, riderId: r.id, categoryKey: null }));

  return entities;
}

/**
 * Splits `text` into an ordered array of segments — plain text and
 * entity matches — by scanning for the longest, earliest match at every
 * position. Longest-first matching avoids one name accidentally
 * swallowing part of another (e.g. two teams sharing a word). Returns
 * `[{ type: "text", value }]` untouched if there's nothing to link.
 */
export function linkifyNewsText(text, entities) {
  if (!text || !entities || !entities.length) return [{ type: "text", value: text }];
  const sorted = [...entities].sort((a, b) => b.name.length - a.name.length);
  const segments = [];
  let cursor = 0;
  const len = text.length;

  while (cursor < len) {
    let bestIndex = -1;
    let bestEntity = null;
    for (const entity of sorted) {
      if (!entity.name) continue;
      const idx = text.indexOf(entity.name, cursor);
      if (idx === -1) continue;
      if (bestIndex === -1 || idx < bestIndex || (idx === bestIndex && entity.name.length > bestEntity.name.length)) {
        bestIndex = idx;
        bestEntity = entity;
      }
    }
    if (bestIndex === -1) {
      segments.push({ type: "text", value: text.slice(cursor) });
      break;
    }
    if (bestIndex > cursor) segments.push({ type: "text", value: text.slice(cursor, bestIndex) });
    segments.push({ ...bestEntity, value: bestEntity.name });
    cursor = bestIndex + bestEntity.name.length;
  }
  return segments;
}
