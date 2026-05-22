import { KNOWN_OPTIMUM, runBatch } from "./src/ga-core.js";

const batch = runBatch({
  runs: 30,
  seed: 90,
  maxGenerations: 180,
});

console.log(JSON.stringify(batch.summary, null, 2));

const nearOptimum = Math.abs(batch.summary.meanBestCost - KNOWN_OPTIMUM.value) <= 0.35;
const feasibleEnough = batch.summary.feasibilityRate >= 0.9;
const stableEnough = batch.summary.stdBestCost <= 0.45;

if (!nearOptimum || !feasibleEnough || !stableEnough) {
  process.exitCode = 1;
}
