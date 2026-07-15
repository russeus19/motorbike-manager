/**
 * Centralized priority-alert registry for the "Inicio" screen. Each
 * alert type is a single, self-contained rule bundling everything it
 * needs: the condition to appear, its priority, the text shown, an
 * icon key (kept as a string here since utils/*.js stays icon-agnostic
 * in this project — see components/UIPrimitives.jsx's PriorityAlertBanner
 * for the icon-key → component mapping) and a navigation target.
 *
 * Nothing here is "dismissed" by reading it and nothing is stored —
 * every alert is derived fresh from the current game state on every
 * call, so an alert can never get stuck once the underlying situation
 * is actually resolved (renewed, signed elsewhere, released, offer
 * decided, season over...), and adding a new alert later only ever
 * means adding one more self-contained block below, never touching
 * scattered logic across components.
 */

import { BIKE_LABELS } from "../data/bikeAreas.js";

// Any negotiation in one of these states is still genuinely "in play" —
// used both to suppress the contract-expiring alert (a renewal or an
// outgoing signing already being negotiated counts as "handled") and to
// decide whether an incoming offer alert is still current.
const ACTIVE_NEGOTIATION_STATUSES = ["pending_team", "team_countered", "pending_rider", "rider_countered"];

export function buildPriorityAlerts({ playerTeam, marketNegotiations, lowStockLabel }) {
  const alerts = [];
  const negotiations = marketNegotiations || [];

  // Aviso: paquete de desarrollo listo para revisar — se muestra aquí en
  // vez de en la propia pantalla de Resultado, y desaparece solo en
  // cuanto el paquete se acepta o se descarta.
  (playerTeam?.pendingPackages || []).forEach((pkg) => {
    alerts.push({
      id: `dev-package-${pkg.id}`,
      priority: 1,
      iconKey: "package",
      text: `📦 Nuevo paquete de ${BIKE_LABELS[pkg.area]} listo — toca para revisarlo.`,
      target: "package",
      packageId: pkg.id,
    });
  });

  // Aviso: stock bajo de piezas del almacén (ya existente, ahora parte
  // del mismo registro centralizado en vez de vivir aparte en SeasonHub).
  if (lowStockLabel) {
    alerts.push({
      id: "warehouse-low-stock",
      priority: 3,
      iconKey: "warning",
      text: `⚠ Stock bajo de ${lowStockLabel}. Toca para ir al Almacén.`,
      target: "warehouse",
    });
  }

  // Aviso: contrato próximo a expirar — desaparece en cuanto exista
  // CUALQUIER negociación no fallida/retirada sobre ese piloto (una
  // renovación en curso o ya firmada, o un fichaje por otro equipo ya
  // acordado), sin importar la dirección de esa negociación.
  (playerTeam?.riders || []).forEach((r) => {
    if ((r.contractYears ?? 0) !== 1 || r.releasedAtSeasonEnd) return;
    const isHandled = negotiations.some((n) => n.riderId === r.id && !["failed", "withdrawn"].includes(n.status));
    if (isHandled) return;
    alerts.push({
      id: `contract-expiring-${r.id}`,
      priority: 1,
      iconKey: "warning",
      text: `⚠️ El contrato de ${r.name} finaliza al término de esta temporada. Decide si quieres renovarle o dejarle marchar.`,
      target: "roster",
    });
  });

  // Aviso: oferta recibida por uno de tus pilotos — activo mientras la
  // negociación siga en cualquier estado no definitivo.
  negotiations.forEach((n) => {
    if (n.fromTeamId !== "player" || n.toTeamId === "player") return;
    if (!ACTIVE_NEGOTIATION_STATUSES.includes(n.status)) return;
    alerts.push({
      id: `incoming-offer-${n.id}`,
      priority: 2,
      iconKey: "mail",
      text: `📨 ${n.toTeamName} ha presentado una oferta por ${n.riderName}.`,
      target: "offers",
    });
  });

  return alerts.sort((a, b) => a.priority - b.priority);
}
