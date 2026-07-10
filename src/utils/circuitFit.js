import { ATTRS } from "../data/attributes.js";
import { BIKE_AREA_KEYS } from "../data/bikeAreas.js";
import { bikeAvg } from "./bikeDevelopment.js";

export function circuitBikeFit(bike, tech) {
  let weightedSum = 0;
  let weightTotal = 0;
  BIKE_AREA_KEYS.forEach((k) => {
    weightedSum += bike[k] * tech[k];
    weightTotal += tech[k];
  });
  const demandWeightedAvg = weightedSum / weightTotal;
  return demandWeightedAvg - bikeAvg(bike);
}

/* Same idea for the rider's 6 attributes against what the circuit favors. */


export function circuitRiderFit(rider, weights) {
  let weightedSum = 0;
  let weightTotal = 0;
  ATTRS.forEach((a) => {
    weightedSum += rider[a.key] * weights[a.key];
    weightTotal += weights[a.key];
  });
  const demandWeightedAvg = weightedSum / weightTotal;
  const plainAvg = ATTRS.reduce((s, a) => s + rider[a.key], 0) / ATTRS.length;
  return demandWeightedAvg - plainAvg;
}

/* The 2 riders who actually take the grid for a team this weekend: a
   sidelined injured rider is swapped for their assigned substitute (if
   any); everyone else races as themselves. team.riders itself never
   changes membership because of an injury — the substitute is only a
   stand-in resolved at race time. */
/* A team's "roster" for lookup purposes is its 2 contracted riders plus
   any substitute currently standing in for one of them — substitutes are
   full riders in every other way (profile, stats, history, contract) and
   must be just as findable. */

