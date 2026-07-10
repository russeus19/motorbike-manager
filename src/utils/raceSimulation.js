import { INJURY_LABELS, INJURY_NAMES } from "../data/injuries.js";
import { POINTS } from "../data/pointsSystem.js";
import { bikeAvg } from "./bikeDevelopment.js";
import { circuitBikeFit, circuitRiderFit } from "./circuitFit.js";
import { clamp, pick, randInt, weightedPick } from "./random.js";
import { riderSkill, wetRiderSkill } from "./riders.js";

export function findInTeamRoster(team, id) {
  const own = team.riders.find((r) => r.id === id);
  if (own) return own;
  const subs = team.substitutes || {};
  for (const ownerId of Object.keys(subs)) {
    if (subs[ownerId].id === id) return subs[ownerId];
  }
  return null;
}


export function raceLineup(team) {
  return team.riders
    .map((r) => {
      if (r.injury && r.injury.sidelined && r.injury.gpRemaining > 0) {
        const sub = team.substitutes?.[r.id];
        return sub ? { ...sub, seatOwnerId: r.id, seatOwnerName: r.name } : null;
      }
      return r;
    })
    .filter(Boolean);
}


export function buildEntries(teamsList) {
  const entries = [];
  teamsList.forEach((t) => {
    const bAvg = bikeAvg(t.bike);
    raceLineup(t).forEach((r) => entries.push({ ...r, teamId: t.id, teamName: t.name, teamColor: t.color, bikeAvgVal: bAvg, bike: t.bike }));
  });
  return entries;
}


export function rollInjury(r, circuit, isWet, roundsLeftInSeason) {
  const speedFactor = circuit ? clamp((circuit.mainStraightM - 700) / 500, -0.25, 0.6) : 0;
  const ageFactor = r.age >= 33 ? 0.15 : r.age >= 29 ? 0.05 : -0.05;
  const fisicoFactor = (62 - r.fisico) * 0.004;
  const crashFactor = clamp((r.crashesThisSeason || 0) * 0.03, 0, 0.2);
  const wetFactor = isWet ? 0.06 : 0;
  const severityPush = clamp(speedFactor + ageFactor + fisicoFactor + crashFactor + wetFactor, -0.25, 0.55);

  const noneWeight = clamp(70 - severityPush * 70, 22, 85);
  const remainder = 100 - noneWeight;
  const weights = {
    none: noneWeight,
    leve: remainder * (20 / 30),
    moderada: remainder * (7 / 30),
    grave: remainder * (2 / 30),
    muyGrave: remainder * (1 / 30),
  };
  const severity = weightedPick(weights);
  if (severity === "none") return null;

  const gpTotal = severity === "leve" ? randInt(1, 2)
    : severity === "moderada" ? randInt(2, 5)
    : severity === "grave" ? randInt(6, 12)
    : Math.max(1, Math.min(roundsLeftInSeason, randInt(13, 22)));

  return {
    name: pick(INJURY_NAMES[severity]),
    severity,
    severityLabel: INJURY_LABELS[severity],
    sidelined: severity !== "leve",
    gpTotal,
    gpRemaining: gpTotal,
  };
}

/* Circuit influence is intentionally modest: the bike-fit and rider-fit
   deltas are bounded to roughly ±8 points each on a ~0-100 performance
   scale, i.e. it can swing a result by something in the 10-20% range —
   enough to reward the right bike/rider for the track without ever being
   the dominant factor (skill and machinery still weigh far more). */


export function simulateEntries(entries, circuit, isWet, roundsLeftInSeason) {
  let bestPreRoll = -Infinity;
  let poleRiderId = null;

  const results = entries.map((r) => {
    const wetPenaltyMult = isWet ? 1.5 + (60 - r.adaptabilidad) / 100 : 1;
    const leveInjuryPenalty = (r.injury && !r.injury.sidelined && r.injury.gpRemaining > 0) ? 6 : 0;
    const dnfChance = clamp(
      (((100 - r.mental) / 100) * 0.15 + (r.adelantamientos / 100) * 0.08 - (r.fisico / 100) * 0.06) * wetPenaltyMult,
      0.02, 0.45
    );
    const crashed = Math.random() < dnfChance;
    const skill = isWet ? wetRiderSkill(r) : riderSkill(r);

    let circuitMod = 0;
    if (circuit) {
      const bikeFit = circuitBikeFit(r.bike || { motor: r.bikeAvgVal, chasis: r.bikeAvgVal, aero: r.bikeAvgVal, suspension: r.bikeAvgVal, electronica: r.bikeAvgVal }, circuit.tech);
      const riderFit = circuitRiderFit(r, circuit.riderWeight);
      circuitMod = clamp(bikeFit * 0.55, -8, 8) + clamp(riderFit * 0.55, -8, 8);
      if (circuit.tags?.includes("Alto desgaste de neumáticos")) {
        const wearResist = (r.ritmo * 0.6 + r.fisico * 0.4);
        circuitMod -= clamp((68 - wearResist) / 12, -1, 3.5);
      }
    }

    const preRoll = skill * 0.5 + r.bikeAvgVal * 0.35 + circuitMod - leveInjuryPenalty;
    if (preRoll > bestPreRoll) { bestPreRoll = preRoll; poleRiderId = r.id; }

    let dnfCause = null;
    let injuryResult = null;
    if (crashed) {
      const reliability = (r.bike?.motor ?? r.bikeAvgVal) * 0.5 + (r.bike?.electronica ?? r.bikeAvgVal) * 0.5;
      const mechChance = clamp(0.40 - (reliability - 70) * 0.004, 0.12, 0.55);
      let crashBias = 0;
      if (isWet) crashBias += 0.12;
      if (circuit?.tags?.includes("Poco agarre")) crashBias += 0.08;
      if (circuit?.tags?.includes("Muy técnico") || circuit?.tags?.includes("Revirado")) crashBias += 0.05;
      crashBias += (r.adelantamientos - 60) * 0.001;
      crashBias -= (r.tecnica - 60) * 0.0008;
      crashBias -= (r.mental - 60) * 0.0006;
      crashBias -= (r.adaptabilidad - 60) * (isWet ? 0.001 : 0.0005);
      const crashShare = clamp((1 - mechChance) + crashBias, 0.35, 0.85);
      dnfCause = Math.random() < crashShare ? "crash" : "mechanical";
      if (dnfCause === "crash") injuryResult = rollInjury(r, circuit, isWet, roundsLeftInSeason ?? 22);
    }

    const perf = preRoll + Math.random() * 15 - (crashed ? 999 : 0);
    return { ...r, perf, crashed, dnfCause, injuryResult };
  });
  results.sort((a, b) => b.perf - a.perf);
  let pointsIdx = 0;
  const withPoints = results.map((r, i) => {
    let points = 0;
    if (!r.crashed && pointsIdx < POINTS.length) { points = POINTS[pointsIdx]; pointsIdx++; }
    return { ...r, position: i + 1, points };
  });
  return { results: withPoints, poleRiderId };
}


export function simulateRound(playerTeam, rivalTeams, circuit, isWet, roundsLeftInSeason) {
  return simulateEntries(buildEntries([playerTeam, ...rivalTeams]), circuit, isWet, roundsLeftInSeason);
}


export function simulateFullGridRound(teams, circuit, isWet, roundsLeftInSeason) {
  return simulateEntries(buildEntries(teams), circuit, isWet, roundsLeftInSeason);
}

/* Increment career wins/podiums for a given category based on a race result */


export function bumpCareerStats(rider, categoryKey, position, crashed) {
  if (crashed) return { ...rider, crashesThisSeason: (rider.crashesThisSeason || 0) + 1 };
  if (position > 3) return rider;
  const careerPodiums = { ...rider.careerPodiums, [categoryKey]: (rider.careerPodiums?.[categoryKey] || 0) + 1 };
  const careerWins = position === 1 ? { ...rider.careerWins, [categoryKey]: (rider.careerWins?.[categoryKey] || 0) + 1 } : rider.careerWins;
  return { ...rider, careerPodiums, careerWins };
}

/* Record each rider's final championship position (and title badge, if any)
   into their season history, using the standings from the season that just
   finished. Must be called before those standings are reset. */


export function estimateLaps(circuit) {
  return Math.max(10, Math.round(112 / circuit.lengthKm));
}


export function formatRaceTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}


export function formatGap(gapSeconds) {
  if (gapSeconds < 60) return `+${gapSeconds.toFixed(3)}`;
  const m = Math.floor(gapSeconds / 60);
  const s = gapSeconds - m * 60;
  return `+${m}:${s.toFixed(3).padStart(6, "0")}`;
}


export function buildClassificationDisplay(results, circuit) {
  const laps = estimateLaps(circuit);
  const lapSeconds = circuit.lengthKm * 24;
  const winnerTotal = laps * lapSeconds;
  const finishers = results.filter((r) => !r.crashed);
  const bestPerf = finishers.length ? finishers[0].perf : 0;
  return results.map((r) => {
    if (r.crashed) {
      return { ...r, laps: Math.max(1, laps - randInt(1, 6)), timeDisplay: "DNF", gapDisplay: "DNF" };
    }
    const gapSeconds = r.position === 1 ? 0 : clamp((bestPerf - r.perf) * 0.18, 0.1, 95);
    return {
      ...r,
      laps,
      timeDisplay: r.position === 1 ? formatRaceTime(winnerTotal) : formatGap(gapSeconds),
      gapDisplay: r.position === 1 ? "Líder" : formatGap(gapSeconds),
    };
  });
}

