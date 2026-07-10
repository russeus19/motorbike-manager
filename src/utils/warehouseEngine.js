import { WAREHOUSE_BASE_COST, WAREHOUSE_LABELS, WAREHOUSE_MIN_TO_RACE, WAREHOUSE_PARTS } from "../data/warehouseParts.js";

export function initWarehouse() {
  const wh = {};
  WAREHOUSE_PARTS.forEach((p) => { wh[p] = { stock: 4, orders: [] }; });
  return wh;
}


export function warehouseCost(part, scale, urgent) {
  return Math.round(WAREHOUSE_BASE_COST[part] * (scale || 1) * (urgent ? 3 : 1));
}

/* Production always takes 1 GP: an order placed now arrives after the
   next race is resolved. */


export function resolveWarehouseProduction(warehouse) {
  const next = {};
  WAREHOUSE_PARTS.forEach((part) => {
    const p = warehouse[part];
    let stock = p.stock;
    const orders = [];
    (p.orders || []).forEach((o) => {
      const gpRemaining = o.gpRemaining - 1;
      if (gpRemaining <= 0) stock += 1; else orders.push({ gpRemaining });
    });
    next[part] = { stock, orders };
  });
  return next;
}


export function queueWarehouseProduction(warehouse, part) {
  return { ...warehouse, [part]: { ...warehouse[part], orders: [...warehouse[part].orders, { gpRemaining: 1 }] } };
}


export function urgentWarehouseProduction(warehouse, part) {
  return { ...warehouse, [part]: { ...warehouse[part], stock: warehouse[part].stock + 1 } };
}

/* A crash always wrecks the fairing; chassis/brake/engine damage is
   possible but never guaranteed, and gets more likely the harder the
   rider hit the deck. A mechanical DNF costs either an engine or a set
   of brakes — nothing else. */


export function consumeWarehouseForResult(warehouse, dnfCause, injurySeverity) {
  if (!dnfCause) return { warehouse, consumed: [] };
  const wh = { ...warehouse };
  const consumed = [];
  const take = (part) => {
    wh[part] = { ...wh[part], stock: Math.max(0, wh[part].stock - 1) };
    consumed.push(part);
  };
  if (dnfCause === "crash") {
    take("carenado");
    const severityBoost = (injurySeverity === "grave" || injurySeverity === "muyGrave") ? 0.18 : injurySeverity === "moderada" ? 0.08 : 0;
    if (Math.random() < 0.20 + severityBoost) take("chasis");
    if (Math.random() < 0.25 + severityBoost) take("freno");
    if (Math.random() < 0.10 + severityBoost) take("motor");
  } else if (dnfCause === "mechanical") {
    if (Math.random() < 0.6) take("motor"); else take("freno");
  }
  return { warehouse: wh, consumed };
}


export function canFieldRace(warehouse, ridersNeeded) {
  if (!warehouse) return true;
  return WAREHOUSE_PARTS.every((part) => warehouse[part].stock >= ridersNeeded);
}

/* AI keeps its own inventory topped up using exactly the same prices and
   rules as the player — normal production ordered right after a race
   always arrives in time for the next one, so urgent fabrication is only
   a rare emergency fallback when budget forced a team to fall behind. */


export function aiManageWarehouse(team, scale, notifQueue, categoryKey) {
  let warehouse = team.warehouse || initWarehouse();
  let budget = team.budget || 0;
  WAREHOUSE_PARTS.forEach((part) => {
    const projected = warehouse[part].stock + warehouse[part].orders.length;
    if (projected < WAREHOUSE_MIN_TO_RACE) {
      const shortfall = WAREHOUSE_MIN_TO_RACE - projected;
      for (let i = 0; i < shortfall; i++) {
        const normalCost = warehouseCost(part, scale, false);
        if (budget >= normalCost) {
          warehouse = queueWarehouseProduction(warehouse, part);
          budget -= normalCost;
        } else {
          const urgentCost = warehouseCost(part, scale, true);
          if (budget >= urgentCost) {
            warehouse = urgentWarehouseProduction(warehouse, part);
            budget -= urgentCost;
            notifQueue.push({ type: "market", category: categoryKey, text: `${team.name} recurre a fabricación urgente de ${WAREHOUSE_LABELS[part]} por falta de stock.` });
          }
        }
      }
    } else if (warehouse[part].stock <= WAREHOUSE_MIN_TO_RACE && warehouse[part].orders.length === 0) {
      const normalCost = warehouseCost(part, scale, false);
      if (budget >= normalCost) {
        warehouse = queueWarehouseProduction(warehouse, part);
        budget -= normalCost;
      }
    }
  });
  return { warehouse, budget };
}

