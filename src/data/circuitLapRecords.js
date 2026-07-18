/**
 * Real-world reference data per circuit and category (round order matches
 * data/circuits.js CIRCUITS/CIRCUIT_PROFILES). Extracted from official
 * MotoGP timing sheets (qualifying + race classifications) across a mix
 * of seasons — used purely as a calibration anchor for lap time and
 * grid/race spread (utils/raceSimulation.js), not as literal historical
 * fact. laps is the real race distance; poleSeconds/worstQualiSeconds
 * are single-lap qualifying times; winnerSeconds is the race winner's
 * total time; worstGapSeconds is the last classified (non-lapped)
 * rider's gap to the winner.
 */
export const CIRCUIT_LAP_RECORDS = [
  // 1. Tailandia
  {
    motogp: { laps: 26, poleSeconds: 88.652, worstQualiSeconds: 91.361, winnerSeconds: 2376.27, worstGapSeconds: 63.598 },
    moto2: { laps: 22, poleSeconds: 94.576, worstQualiSeconds: 95.888, winnerSeconds: 2113.072, worstGapSeconds: 37.405 },
    moto3: { laps: 19, poleSeconds: 100.088, worstQualiSeconds: null, winnerSeconds: 1934.186, worstGapSeconds: 54.641 },
  },
  // 2. Brasil
  {
    motogp: { laps: 23, poleSeconds: 77.41, worstQualiSeconds: 78.479, winnerSeconds: 1819.76, worstGapSeconds: 36.397 },
    moto2: { laps: 26, poleSeconds: 80.711, worstQualiSeconds: 82.049, winnerSeconds: 2146.382, worstGapSeconds: 40.307 },
    moto3: { laps: 19, poleSeconds: 86.241, worstQualiSeconds: 88.825, winnerSeconds: 1667.3, worstGapSeconds: 35.14 },
  },
  // 3. Las Américas
  {
    motogp: { laps: 20, poleSeconds: 120.136, worstQualiSeconds: 122.366, winnerSeconds: 2450.653, worstGapSeconds: 38.701 },
    moto2: { laps: 16, poleSeconds: 125.347, worstQualiSeconds: 127.439, winnerSeconds: 2244.22, worstGapSeconds: 72.118 },
    moto3: { laps: 14, poleSeconds: 132.107, worstQualiSeconds: 135.013, winnerSeconds: 1880.489, worstGapSeconds: 61.694 },
  },
  // 4. Jerez
  {
    motogp: { laps: 25, poleSeconds: 108.087, worstQualiSeconds: 111.444, winnerSeconds: 2448.861, worstGapSeconds: 65.023 },
    moto2: { laps: 21, poleSeconds: 99.101, worstQualiSeconds: 100.913, winnerSeconds: 2117.948, worstGapSeconds: 36.244 },
    moto3: { laps: 19, poleSeconds: 104.07, worstQualiSeconds: 107.816, winnerSeconds: 2003.556, worstGapSeconds: 30.18 },
  },
  // 5. Francia
  {
    motogp: { laps: 27, poleSeconds: 89.634, worstQualiSeconds: 90.616, winnerSeconds: 2478.001, worstGapSeconds: 73.229 },
    moto2: { laps: 22, poleSeconds: 93.91, worstQualiSeconds: 95.187, winnerSeconds: 2089.96, worstGapSeconds: 64.343 },
    moto3: { laps: 20, poleSeconds: 100.184, worstQualiSeconds: 102.085, winnerSeconds: 2279.446, worstGapSeconds: 147.385 },
  },
  // 6. Catalunya
  {
    motogp: { laps: 24, poleSeconds: 98.068, worstQualiSeconds: 98.785, winnerSeconds: 2414.093, worstGapSeconds: 43.202 },
    moto2: { laps: 21, poleSeconds: 101.076, worstQualiSeconds: 103.381, winnerSeconds: 2166.295, worstGapSeconds: 49.14 },
    moto3: { laps: 18, poleSeconds: 106.679, worstQualiSeconds: 108.703, winnerSeconds: 1948.964, worstGapSeconds: 40.082 },
  },
  // 7. Italia
  {
    motogp: { laps: 23, poleSeconds: 103.921, worstQualiSeconds: 105.049, winnerSeconds: 2457.347, worstGapSeconds: 40.553 },
    moto2: { laps: 19, poleSeconds: 108.474, worstQualiSeconds: 110.417, winnerSeconds: 2112.315, worstGapSeconds: 35.661 },
    moto3: { laps: 17, poleSeconds: 114.862, worstQualiSeconds: 117.37, winnerSeconds: 1987.801, worstGapSeconds: 26.435 },
  },
  // 8. Hungría
  {
    motogp: { laps: 26, poleSeconds: 96.785, worstQualiSeconds: 98.241, winnerSeconds: 2575.325, worstGapSeconds: 54.604 },
    moto2: { laps: 22, poleSeconds: 100.28, worstQualiSeconds: 101.282, winnerSeconds: 2230.278, worstGapSeconds: 64.501 },
    moto3: { laps: 19, poleSeconds: 105.686, worstQualiSeconds: 108.622, winnerSeconds: 2019.745, worstGapSeconds: 45.158 },
  },
  // 9. Chequia
  {
    motogp: { laps: 21, poleSeconds: 111.139, worstQualiSeconds: 112.084, winnerSeconds: 2391.297, worstGapSeconds: 44.784 },
    moto2: { laps: 18, poleSeconds: 117.718, worstQualiSeconds: 119.949, winnerSeconds: 2153.143, worstGapSeconds: 35.093 },
    moto3: { laps: 16, poleSeconds: 124.069, worstQualiSeconds: 126.896, winnerSeconds: 2014.264, worstGapSeconds: 26.814 },
  },
  // 10. Países Bajos
  {
    motogp: { laps: 26, poleSeconds: 90.812, worstQualiSeconds: 91.604, winnerSeconds: 2421.905, worstGapSeconds: 76.826 },
    moto2: { laps: 22, poleSeconds: 95.236, worstQualiSeconds: 97.452, winnerSeconds: 2133.175, worstGapSeconds: 37.515 },
    moto3: { laps: 20, poleSeconds: 100.13, worstQualiSeconds: 104.08, winnerSeconds: 2031.801, worstGapSeconds: 73.409 },
  },
  // 11. Alemania
  {
    motogp: { laps: 30, poleSeconds: 79.041, worstQualiSeconds: 79.781, winnerSeconds: 2453.148, worstGapSeconds: 38.122 },
    moto2: { laps: 25, poleSeconds: 81.493, worstQualiSeconds: 83.268, winnerSeconds: 2100.119, worstGapSeconds: 48.793 },
    moto3: { laps: 23, poleSeconds: 84.88, worstQualiSeconds: 88.047, winnerSeconds: 1982.694, worstGapSeconds: 83.681 },
  },
  // 12. Gran Bretaña
  {
    motogp: { laps: 19, poleSeconds: 117.233, worstQualiSeconds: 118.457, winnerSeconds: 2296.037, worstGapSeconds: 64.884 },
    moto2: { laps: 17, poleSeconds: 122.482, worstQualiSeconds: 125.474, winnerSeconds: 2126.39, worstGapSeconds: 40.56 },
    moto3: { laps: 15, poleSeconds: 129.449, worstQualiSeconds: 135.12, winnerSeconds: 1978.943, worstGapSeconds: 80.183 },
  },
  // 13. Aragón
  {
    motogp: { laps: 23, poleSeconds: 105.704, worstQualiSeconds: 106.775, winnerSeconds: 2471.195, worstGapSeconds: 86.319 },
    moto2: { laps: 19, poleSeconds: 109.94, worstQualiSeconds: 113.497, winnerSeconds: 2112.6, worstGapSeconds: 102.053 },
    moto3: { laps: 17, poleSeconds: 116.361, worstQualiSeconds: 119.202, winnerSeconds: 2013.745, worstGapSeconds: 48.777 },
  },
  // 14. San Marino
  {
    motogp: { laps: 27, poleSeconds: 90.134, worstQualiSeconds: 90.981, winnerSeconds: 2480.898, worstGapSeconds: 61.932 },
    moto2: { laps: 22, poleSeconds: 94.216, worstQualiSeconds: 96.46, winnerSeconds: 2103.863, worstGapSeconds: 48.937 },
    moto3: { laps: 20, poleSeconds: 100.328, worstQualiSeconds: 103.465, winnerSeconds: 2028.906, worstGapSeconds: 42.546 },
  },
  // 15. Austria
  {
    motogp: { laps: 28, poleSeconds: 88.06, worstQualiSeconds: 88.787, winnerSeconds: 2531.006, worstGapSeconds: 37.478 },
    moto2: { laps: 23, poleSeconds: 92.779, worstQualiSeconds: 94.918, winnerSeconds: 2165.205, worstGapSeconds: 49.544 },
    moto3: { laps: 20, poleSeconds: 99.938, worstQualiSeconds: 104.939, winnerSeconds: 2016.516, worstGapSeconds: 43.591 },
  },
  // 16. Japón
  {
    motogp: { laps: 24, poleSeconds: 102.911, worstQualiSeconds: 103.571, winnerSeconds: 2529.312, worstGapSeconds: 34.792 },
    moto2: { laps: 19, poleSeconds: 107.925, worstQualiSeconds: 109.775, winnerSeconds: 2090.326, worstGapSeconds: 32.865 },
    moto3: { laps: 17, poleSeconds: 114.826, worstQualiSeconds: 117.646, winnerSeconds: 1989.599, worstGapSeconds: 68.971 },
  },
  // 17. Indonesia
  {
    motogp: { laps: 27, poleSeconds: 88.832, worstQualiSeconds: 89.959, winnerSeconds: 2467.651, worstGapSeconds: 55.54 },
    moto2: { laps: 22, poleSeconds: 92.341, worstQualiSeconds: 94.167, winnerSeconds: 2063.8, worstGapSeconds: 37.634 },
    moto3: { laps: 18, poleSeconds: 97.022, worstQualiSeconds: 99.947, winnerSeconds: 1768.292, worstGapSeconds: 34.53 },
  },
  // 18. Australia
  {
    motogp: { laps: 27, poleSeconds: 86.465, worstQualiSeconds: 87.491, winnerSeconds: 2389.571, worstGapSeconds: 50.303 },
    moto2: { laps: 23, poleSeconds: 89.817, worstQualiSeconds: 92.413, winnerSeconds: 2100.085, worstGapSeconds: 61.394 },
    moto3: { laps: 21, poleSeconds: 94.056, worstQualiSeconds: 97.032, winnerSeconds: 2019.062, worstGapSeconds: 66.778 },
  },
  // 19. Malasia
  {
    motogp: { laps: 20, poleSeconds: 117.001, worstQualiSeconds: 118.174, winnerSeconds: 2409.249, worstGapSeconds: 77.942 },
    moto2: { laps: 17, poleSeconds: 122.858, worstQualiSeconds: 128.33, winnerSeconds: 2140.87, worstGapSeconds: 69.816 },
    moto3: { laps: 15, poleSeconds: 129.846, worstQualiSeconds: 138.742, winnerSeconds: 1983.671, worstGapSeconds: 45.159 },
  },
  // 20. Qatar
  {
    motogp: { laps: 22, poleSeconds: 110.499, worstQualiSeconds: 113.244, winnerSeconds: 2489.186, worstGapSeconds: 38.186 },
    moto2: { laps: 18, poleSeconds: 116.301, worstQualiSeconds: 118.821, winnerSeconds: 2130.185, worstGapSeconds: 25.409 },
    moto3: { laps: 16, poleSeconds: 122.638, worstQualiSeconds: 125.132, winnerSeconds: 1997.268, worstGapSeconds: 29.352 },
  },
  // 21. Portugal
  {
    motogp: { laps: 25, poleSeconds: 97.556, worstQualiSeconds: 98.525, winnerSeconds: 2473.616, worstGapSeconds: 61.999 },
    moto2: { laps: 21, poleSeconds: 101.168, worstQualiSeconds: 104.383, winnerSeconds: 2140.573, worstGapSeconds: 66.023 },
    moto3: { laps: 19, poleSeconds: 106.764, worstQualiSeconds: 109.027, winnerSeconds: 2045.182, worstGapSeconds: 39.522 },
  },
  // 22. Comunidad Valenciana
  {
    motogp: { laps: 27, poleSeconds: 88.809, worstQualiSeconds: 89.371, winnerSeconds: 2452.458, worstGapSeconds: 39.136 },
    moto2: { laps: 22, poleSeconds: 91.715, worstQualiSeconds: 93.675, winnerSeconds: 2059.229, worstGapSeconds: 33.805 },
    moto3: { laps: 20, poleSeconds: 96.99, worstQualiSeconds: 98.856, winnerSeconds: 1968.909, worstGapSeconds: 47.939 },
  },
];