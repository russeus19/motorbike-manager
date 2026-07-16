import { INJURY_LABELS, INJURY_NAMES } from "../data/injuries.js";
import { POINTS } from "../data/pointsSystem.js";
import { bikeAvg } from "./bikeDevelopment.js";
import { circuitBikeFit, circuitRiderFit } from "./circuitFit.js";
import { clamp, pick, randInt, weightedPick } from "./random.js";
import { moraleSkillMultiplier } from "./riderMorale.js";
import { riderSkill, wetRiderSkill } from "./riders.js";

/* How much a grid position alone is worth in perf-units, added to a
   rider's race preRoll. Calibrated by Monte Carlo against an idealized
   equal-skill grid so that, all else being equal, P1 wins ~40% of the
   time, P2 ~20%, P3 ~13%, P4 ~8%, P5 ~5%, P6 ~3%, decaying naturally
   from there — never so large that skill/machinery stop mattering, but
   real enough that qualifying well is genuinely worth something. */
export function computeGridBonus(gridPosition) {
  if (!Number.isFinite(gridPosition) || gridPosition < 1) return 0;
  return 7 * Math.pow(0.72, gridPosition - 1);
}

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
        if (!sub) return null;
        if (sub.injury && sub.injury.sidelined && sub.injury.gpRemaining > 0) return null;
        return { ...sub, seatOwnerId: r.id, seatOwnerName: r.name };
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

/**
 * A believable lap time for THIS circuit and THIS category — the single
 * source of truth for lap time everywhere it's needed (qualifying,
 * race classification), so MotoGP/Moto2/Moto3 never end up sharing an
 * identical pole time again. Built from the circuit's own real
 * characteristics (length, main straight, how twisty it is) rather than
 * length alone, then scaled by a realistic category speed factor:
 * Moto2 laps run ~3-4% slower than MotoGP on a typical circuit, Moto3
 * ~8-9% slower — matching the gaps actually seen on a real MotoGP
 * weekend, not a flat, arbitrary number.
 */
const CATEGORY_SPEED_FACTOR = { motogp: 1, moto2: 0.965, moto3: 0.915 };

export function estimateAvgSpeedKmh(circuit, categoryKey) {
  if (!circuit) return 155;
  const totalCorners = (circuit.cornersLeft || 0) + (circuit.cornersRight || 0);
  const cornerDensity = circuit.lengthKm ? totalCorners / circuit.lengthKm : 3;
  // A track with many corners packed into a short lap runs a much lower
  // average speed than a flowing, wide-open one — this is what actually
  // separates a stop-and-go circuit from a power track, not raw length.
  let baseSpeed = 175 - cornerDensity * 4.2;
  baseSpeed += clamp(((circuit.mainStraightM ?? 700) - 700) * 0.012, -6, 8);
  baseSpeed = clamp(baseSpeed, 148, 192);
  return baseSpeed * (CATEGORY_SPEED_FACTOR[categoryKey] ?? 1);
}

export function estimateLapSeconds(circuit, categoryKey, isQualifying = false) {
  const real = circuit?.records?.[categoryKey];
  if (real) {
    // The real figure is a reference point, not a fixed constant — every
    // simulated qualifying/race jitters around it (roughly ±1.8%) so a
    // given circuit's pole or race pace lands in the same realistic
    // neighborhood without ever being an exact repeat of the same
    // millisecond time after time.
    const jitter = 1 + (Math.random() * 2 - 1) * 0.018;
    if (isQualifying && real.poleSeconds) return real.poleSeconds * jitter;
    if (!isQualifying && real.winnerSeconds && real.laps) return (real.winnerSeconds / real.laps) * jitter;
  }
  const speed = estimateAvgSpeedKmh(circuit, categoryKey);
  const lapSeconds = ((circuit?.lengthKm ?? 4.5) / speed) * 3600;
  // A qualifying flying lap (light fuel, fresh tyre, one all-out attempt)
  // runs a little quicker than typical race pace across a full distance.
  return isQualifying ? lapSeconds * 0.955 : lapSeconds;
}

/**
 * A single qualifying session: one flying lap each, correlated with (but
 * not identical to) race pace — same skill/bike/circuit-fit foundation,
 * fresh random roll. Crash risk is real but lower than a full race (one
 * lap of pushing, not 20+), and any resulting injury forces sidelining
 * for THIS race regardless of its rolled severity — even a mild knock in
 * Q means missing Sunday, since there's no time to arrange a substitute
 * before the race. Returns grid order (crashed riders sent to the back,
 * in random order among themselves, since they set no valid time),
 * pole/qualifying times for display, and each crash's injury result so
 * the caller can attach it to the roster before the race is built.
 */
export function simulateQualifying(entries, circuit, isWet, roundsLeftInSeason, categoryKey) {
  const rolled = entries.map((r) => {
    const wetPenaltyMult = isWet ? 1.4 + (60 - r.adaptabilidad) / 100 : 1;
    const dnfChance = clamp(
      (((100 - r.mental) / 100) * 0.15 + (r.adelantamientos / 100) * 0.08 - (r.fisico / 100) * 0.06) * wetPenaltyMult * 0.35,
      0.005, 0.16
    );
    const crashed = Math.random() < dnfChance;
    const skill = (isWet ? wetRiderSkill(r) : riderSkill(r)) * moraleSkillMultiplier(r);

    let circuitMod = 0;
    if (circuit) {
      const bikeFit = circuitBikeFit(r.bike || { motor: r.bikeAvgVal, chasis: r.bikeAvgVal, aero: r.bikeAvgVal, freno: r.bikeAvgVal, electronica: r.bikeAvgVal }, circuit.tech);
      const riderFit = circuitRiderFit(r, circuit.riderWeight);
      circuitMod = clamp(bikeFit * 0.55, -8, 8) + clamp(riderFit * 0.55, -8, 8);
    }
    const pace = skill * 0.5 + r.bikeAvgVal * 0.35 + circuitMod + Math.random() * 12;

    let injuryResult = null;
    if (crashed) {
      injuryResult = rollInjury(r, circuit, isWet, roundsLeftInSeason ?? 22);
      // Any crash injury in qualifying costs the rider Sunday's race no
      // matter how mild it looked on paper — sidelined is forced true
      // here (raceLineup already excludes anyone sidelined with
      // gpRemaining > 0), while the underlying severity/gpTotal stay
      // exactly as rolled for however many further races it costs
      // beyond this one.
      if (injuryResult) injuryResult = { ...injuryResult, sidelined: true };
    }
    return { ...r, pace, crashed, injuryResult };
  });

  const clean = rolled.filter((r) => !r.crashed).sort((a, b) => b.pace - a.pace);
  const crashedRiders = rolled.filter((r) => r.crashed).sort(() => Math.random() - 0.5);
  const ordered = [...clean, ...crashedRiders];

  const gridPositionById = {};
  ordered.forEach((r, i) => { gridPositionById[r.id] = i + 1; });

  // A qualifying lap runs lighter and on a fresh tyre, so it's quicker
  // than the race-pace baseline used for the race classification — and
  // now genuinely varies by category, not just by circuit length.
  const lapSeconds = estimateLapSeconds(circuit, categoryKey, true);
  const bestPace = clean.length ? clean[0].pace : 0;
  const realRecord = circuit?.records?.[categoryKey];
  const qualiGapCeiling = (realRecord?.worstQualiSeconds && realRecord?.poleSeconds)
    ? realRecord.worstQualiSeconds - realRecord.poleSeconds
    : 3.5;
  const withTimes = ordered.map((r, i) => {
    if (r.crashed) return { ...r, gridPosition: i + 1, qualyTimeDisplay: "Sin tiempo" };
    const gapSeconds = i === 0 ? 0 : clamp((bestPace - r.pace) * 0.05, 0.01, qualiGapCeiling);
    return {
      ...r,
      gridPosition: i + 1,
      qualyTimeSeconds: lapSeconds + gapSeconds,
      qualyTimeDisplay: i === 0 ? formatRaceTime(lapSeconds) : `+${gapSeconds.toFixed(3)}`,
    };
  });

  return {
    results: withTimes,
    poleRiderId: clean.length ? clean[0].id : null,
    gridPositionById,
  };
}

/* Circuit influence is intentionally modest: the bike-fit and rider-fit
   deltas are bounded to roughly ±8 points each on a ~0-100 performance
   scale, i.e. it can swing a result by something in the 10-20% range —
   enough to reward the right bike/rider for the track without ever being
   the dominant factor (skill and machinery still weigh far more). */


export function simulateEntries(entries, circuit, isWet, roundsLeftInSeason, gridPositionById = null, pointsTable = POINTS, dnfScale = 1) {
  let bestPreRoll = -Infinity;
  let poleRiderId = null;

  const results = entries.map((r) => {
    const wetPenaltyMult = isWet ? 1.5 + (60 - r.adaptabilidad) / 100 : 1;
    const leveInjuryPenalty = (r.injury && !r.injury.sidelined && r.injury.gpRemaining > 0) ? 6 : 0;
    const dnfChance = clamp(
      (((100 - r.mental) / 100) * 0.15 + (r.adelantamientos / 100) * 0.08 - (r.fisico / 100) * 0.06) * wetPenaltyMult * dnfScale,
      0.02 * dnfScale, 0.45
    );
    const crashed = Math.random() < dnfChance;
    const skill = (isWet ? wetRiderSkill(r) : riderSkill(r)) * moraleSkillMultiplier(r);

    let circuitMod = 0;
    if (circuit) {
      const bikeFit = circuitBikeFit(r.bike || { motor: r.bikeAvgVal, chasis: r.bikeAvgVal, aero: r.bikeAvgVal, freno: r.bikeAvgVal, electronica: r.bikeAvgVal }, circuit.tech);
      const riderFit = circuitRiderFit(r, circuit.riderWeight);
      circuitMod = clamp(bikeFit * 0.55, -8, 8) + clamp(riderFit * 0.55, -8, 8);
      if (circuit.tags?.includes("Alto desgaste de neumáticos")) {
        const wearResist = (r.ritmo * 0.6 + r.fisico * 0.4);
        circuitMod -= clamp((68 - wearResist) / 12, -1, 3.5);
      }
    }

    const gridBonus = gridPositionById ? computeGridBonus(gridPositionById[r.id]) : 0;
    const preRoll = skill * 0.5 + r.bikeAvgVal * 0.35 + circuitMod - leveInjuryPenalty + gridBonus;
    if (preRoll > bestPreRoll) { bestPreRoll = preRoll; poleRiderId = r.id; }

    let dnfCause = null;
    let injuryResult = null;
    if (crashed) {
      const motorRel = r.bike?.motor ?? r.bikeAvgVal;
      const frenoRel = r.bike?.freno ?? r.bikeAvgVal;
      const electRel = r.bike?.electronica ?? r.bikeAvgVal;
      const reliability = (motorRel + frenoRel + electRel) / 3;
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
      if (Math.random() < crashShare) {
        dnfCause = "crash";
        injuryResult = rollInjury(r, circuit, isWet, roundsLeftInSeason ?? 22);
      } else {
        // Split the non-crash failure between the engine/brakes
        // (mechanical) and the electronics unit (electrical) — a bike
        // whose electronics are relatively weaker than its motor/freno
        // fails electrically more often, and vice versa.
        const mechRel = (motorRel + frenoRel) / 2;
        const electricalShare = clamp(0.35 + (mechRel - electRel) * 0.01, 0.15, 0.6);
        dnfCause = Math.random() < electricalShare ? "electrical" : "mechanical";
      }
    }

    const perf = preRoll + Math.random() * 15 - (crashed ? 999 : 0);
    // A rider's single best lap of the race — biased by the same
    // skill/bike/circuit fit as their overall pace, but rolled
    // independently, since the fastest lap and the race result are
    // related but not identical (someone can post the fastest lap
    // chasing a win they don't get, or on a late charge after a bad
    // start). Never rolled for anyone who didn't finish.
    const bestLapRoll = crashed ? -Infinity : skill * 0.5 + r.bikeAvgVal * 0.35 + circuitMod + Math.random() * 20;
    return { ...r, perf, crashed, dnfCause, injuryResult, bestLapRoll };
  });
  results.sort((a, b) => b.perf - a.perf);
  let pointsIdx = 0;
  const withPoints = results.map((r, i) => {
    let points = 0;
    if (!r.crashed && pointsIdx < pointsTable.length) { points = pointsTable[pointsIdx]; pointsIdx++; }
    return { ...r, position: i + 1, points };
  });
  const fastestLapEntry = withPoints.reduce((best, r) => (
    !r.crashed && r.bestLapRoll > (best?.bestLapRoll ?? -Infinity) ? r : best
  ), null);
  return { results: withPoints, poleRiderId, fastestLapRiderId: fastestLapEntry?.id ?? null };
}


export function simulateRound(playerTeam, rivalTeams, circuit, isWet, roundsLeftInSeason, gridPositionById, pointsTable, dnfScale) {
  return simulateEntries(buildEntries([playerTeam, ...rivalTeams]), circuit, isWet, roundsLeftInSeason, gridPositionById, pointsTable, dnfScale);
}


export function simulateFullGridRound(teams, circuit, isWet, roundsLeftInSeason, gridPositionById, pointsTable, dnfScale) {
  return simulateEntries(buildEntries(teams), circuit, isWet, roundsLeftInSeason, gridPositionById, pointsTable, dnfScale);
}

/* Increment career wins/podiums for a given category based on a race result */


export function bumpCareerStats(rider, categoryKey, position, crashed, points, isSprint = false) {
  if (isSprint) {
    if (crashed || position > 3) return rider;
    const careerSprintPodiums = { ...rider.careerSprintPodiums, [categoryKey]: (rider.careerSprintPodiums?.[categoryKey] || 0) + 1 };
    const careerSprintWins = position === 1 ? { ...rider.careerSprintWins, [categoryKey]: (rider.careerSprintWins?.[categoryKey] || 0) + 1 } : rider.careerSprintWins;
    return { ...rider, careerSprintPodiums, careerSprintWins };
  }
  const recentResults = [...(rider.recentResults || []), { position, points: points ?? 0, crashed: !!crashed }].slice(-3);
  if (crashed) return { ...rider, crashesThisSeason: (rider.crashesThisSeason || 0) + 1, recentResults };
  if (position > 3) return { ...rider, recentResults };
  const careerPodiums = { ...rider.careerPodiums, [categoryKey]: (rider.careerPodiums?.[categoryKey] || 0) + 1 };
  const careerWins = position === 1 ? { ...rider.careerWins, [categoryKey]: (rider.careerWins?.[categoryKey] || 0) + 1 } : rider.careerWins;
  return { ...rider, careerPodiums, careerWins, recentResults };
}

/* Record each rider's final championship position (and title badge, if any)
   into their season history, using the standings from the season that just
   finished. Must be called before those standings are reset. */


export function estimateLaps(circuit, categoryKey) {
  const real = circuit?.records?.[categoryKey]?.laps;
  if (real) return real;
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


export function buildClassificationDisplay(results, circuit, fastestLapRiderId = null, categoryKey = null, isSprint = false) {
  const fullLaps = estimateLaps(circuit, categoryKey);
  const laps = isSprint ? Math.max(3, Math.round(fullLaps / 2)) : fullLaps;
  const lapSeconds = estimateLapSeconds(circuit, categoryKey, false);
  const winnerTotal = laps * lapSeconds;
  const finishers = results.filter((r) => !r.crashed);
  const bestPerf = finishers.length ? finishers[0].perf : 0;
  const gapCeiling = (circuit?.records?.[categoryKey]?.worstGapSeconds ?? 95) * (isSprint ? 0.5 : 1);
  return results.map((r) => {
    const isFastestLap = fastestLapRiderId != null && r.id === fastestLapRiderId;
    if (r.crashed) {
      return { ...r, laps: Math.max(1, laps - randInt(1, 6)), timeDisplay: "DNF", gapDisplay: "DNF", isFastestLap };
    }
    const gapSeconds = r.position === 1 ? 0 : clamp((bestPerf - r.perf) * 0.18, 0.1, gapCeiling);
    return {
      ...r,
      laps,
      timeDisplay: r.position === 1 ? formatRaceTime(winnerTotal) : formatGap(gapSeconds),
      gapDisplay: r.position === 1 ? "Líder" : formatGap(gapSeconds),
      isFastestLap,
    };
  });
}

