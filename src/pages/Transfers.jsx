/**
 * The old manual "pick your 2 riders" market screen (MarketScreen) that
 * used to live in this file has been permanently removed. It was the
 * one remaining place that could override a team's roster independently
 * of contracts — as of this pass, contractYears and confirmed live-
 * market negotiations (utils/marketNegotiations.js) are the ONLY things
 * that decide who races for a team next season. See
 * App.jsx's runSeasonTransition and pages/TransferSummary.jsx (now a
 * pure, read-only report of what the season's contracts/negotiations
 * actually produced).
 *
 * This file is kept as an empty module rather than deleted outright so
 * that nothing else in the project needs to change if something still
 * references its path; nothing currently imports from it.
 */
