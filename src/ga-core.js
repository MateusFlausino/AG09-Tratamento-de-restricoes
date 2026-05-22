export const KNOWN_OPTIMUM = {
  genes: [2, 2],
  value: 2,
};

export const DEFAULT_CONFIG = {
  lowerBound: 0,
  upperBound: 5,
  populationSize: 60,
  crossoverRate: 0.78,
  mutationRate: 0.16,
  mutationScale: 0.35,
  penaltyWeight: 80,
  maxGenerations: 180,
  runs: 30,
  method: "deb",
};

const FITNESS_EPSILON = 1e-9;

export function createMulberry32(seed) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeSeed(seed) {
  if (Number.isFinite(seed)) {
    return Math.abs(Math.trunc(seed)) || 1;
  }

  return Date.now() % 2147483647 || 1;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length <= 1) {
    return 0;
  }

  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function randomNormal(rng) {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function randomGene(config, rng) {
  return config.lowerBound + rng() * (config.upperBound - config.lowerBound);
}

function randomGenome(config, rng) {
  return [randomGene(config, rng), randomGene(config, rng)];
}

function shuffle(values, rng) {
  const clone = [...values];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }

  return clone;
}

export function objective([x1, x2]) {
  return (x1 - 1) ** 2 + (x2 - 2) ** 2 + 1;
}

export function constraintValues([x1, x2]) {
  return {
    g1: x1 + x2 - 4,
    g2: 2 - x1,
    g3: 1 - x2,
  };
}

export function violation(genome) {
  const constraints = constraintValues(genome);
  return Object.values(constraints).reduce((sum, value) => sum + Math.max(0, value), 0);
}

export function evaluateGenome(genome, config = DEFAULT_CONFIG) {
  const cost = objective(genome);
  const totalViolation = violation(genome);
  const penalizedCost = cost + config.penaltyWeight * totalViolation;

  return {
    genome: [...genome],
    genes: [...genome],
    cost,
    violation: totalViolation,
    penalizedCost,
    feasible: totalViolation <= 1e-8,
    constraints: constraintValues(genome),
  };
}

function compareByDeb(left, right) {
  if (left.feasible && !right.feasible) {
    return -1;
  }

  if (!left.feasible && right.feasible) {
    return 1;
  }

  if (left.feasible && right.feasible) {
    return left.cost - right.cost;
  }

  return left.violation - right.violation;
}

function compareEvaluations(left, right, method) {
  if (method === "penalty") {
    return left.penalizedCost - right.penalizedCost;
  }

  return compareByDeb(left, right);
}

function rankingScores(evaluated, method) {
  const ranked = [...evaluated].sort((left, right) => compareEvaluations(left, right, method));
  const scoreById = new Map();

  ranked.forEach((entry, index) => {
    scoreById.set(entry.id, ranked.length - index + FITNESS_EPSILON);
  });

  return evaluated.map((entry) => scoreById.get(entry.id));
}

function mutationStep(genome, config, mutationRate, rng) {
  const mutated = [];
  let mutations = 0;

  for (const gene of genome) {
    if (rng() <= mutationRate) {
      mutated.push(clamp(gene + randomNormal(rng) * config.mutationScale, config.lowerBound, config.upperBound));
      mutations += 1;
    } else {
      mutated.push(gene);
    }
  }

  return { genome: mutated, mutations };
}

function crossoverStep(parentA, parentB, crossoverRate, rng) {
  if (rng() > crossoverRate) {
    return {
      genomes: [[...parentA], [...parentB]],
      used: false,
    };
  }

  const alpha = rng();
  return {
    genomes: [
      parentA.map((gene, index) => alpha * gene + (1 - alpha) * parentB[index]),
      parentB.map((gene, index) => alpha * gene + (1 - alpha) * parentA[index]),
    ],
    used: true,
  };
}

export class ConstraintGeneticArena {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.seed = normalizeSeed(config.seed);
    this.rng = createMulberry32(this.seed);
    this.population = [];
    this.generation = 0;
    this.bestEver = null;
    this.history = [];
    this.lastSnapshot = null;
    this.reset(this.seed);
  }

  reset(seed = Date.now()) {
    this.seed = normalizeSeed(seed);
    this.rng = createMulberry32(this.seed);
    this.generation = 0;
    this.bestEver = null;
    this.history = [];
    this.population = Array.from({ length: this.config.populationSize }, () =>
      randomGenome(this.config, this.rng),
    );

    return this.captureSnapshot({
      trigger: "reset",
      meta: { crossoverPairs: 0, mutations: 0 },
    });
  }

  captureSnapshot({ trigger, meta }) {
    const evaluated = this.population.map((genome, index) => ({
      id: index + 1,
      ...evaluateGenome(genome, this.config),
    }));

    const scores = rankingScores(evaluated, this.config.method);
    for (let index = 0; index < evaluated.length; index += 1) {
      evaluated[index].selectionScore = scores[index];
    }

    const leaderboard = [...evaluated].sort((left, right) =>
      compareEvaluations(left, right, this.config.method),
    );
    const best = { ...leaderboard[0] };
    const feasibleCount = evaluated.filter((entry) => entry.feasible).length;
    const feasibilityRate = feasibleCount / evaluated.length;
    const averageCost = average(evaluated.map((entry) => entry.cost));
    const averageViolation = average(evaluated.map((entry) => entry.violation));

    if (!this.bestEver || compareEvaluations(best, this.bestEver, this.config.method) < 0) {
      this.bestEver = { ...best, generation: this.generation };
    }

    this.history.push({
      generation: this.generation,
      bestCost: best.cost,
      bestPenalty: best.penalizedCost,
      bestEverCost: this.bestEver.cost,
      averageCost,
      averageViolation,
      feasibilityRate,
    });

    const snapshot = {
      generation: this.generation,
      config: { ...this.config },
      evaluated,
      leaderboard: leaderboard.slice(0, 6),
      best,
      bestEver: { ...this.bestEver },
      averageCost,
      averageViolation,
      feasibilityRate,
      feasibleCount,
      history: this.history.map((entry) => ({ ...entry })),
      objectiveLabel: "min f(x) = (x1 - 1)^2 + (x2 - 2)^2 + 1",
      constraintsLabel: "x1 + x2 <= 4; x1 >= 2; x2 >= 1",
      trigger,
      meta,
    };

    this.lastSnapshot = snapshot;
    return snapshot;
  }

  selectParents(evaluated) {
    const totalScore = evaluated.reduce((sum, entry) => sum + entry.selectionScore, 0);
    const cumulative = [];
    let running = 0;

    for (const entry of evaluated) {
      running += entry.selectionScore;
      cumulative.push(running);
    }

    const parents = [];
    for (let slot = 0; slot < this.config.populationSize; slot += 1) {
      const draw = this.rng() * totalScore;
      let chosenIndex = 0;

      while (chosenIndex < cumulative.length && draw > cumulative[chosenIndex]) {
        chosenIndex += 1;
      }

      parents.push([...evaluated[clamp(chosenIndex, 0, evaluated.length - 1)].genome]);
    }

    return parents;
  }

  step(overrides = {}) {
    const generationConfig = {
      crossoverRate: overrides.crossoverRate ?? this.config.crossoverRate,
      mutationRate: overrides.mutationRate ?? this.config.mutationRate,
    };

    const baseSnapshot =
      this.lastSnapshot ||
      this.captureSnapshot({
        trigger: "resume",
        meta: { crossoverPairs: 0, mutations: 0 },
      });

    const selectedParents = this.selectParents(baseSnapshot.evaluated);
    const shuffledParents = shuffle(selectedParents, this.rng);
    const nextPopulation = [];
    let crossoverPairs = 0;
    let mutations = 0;

    for (let index = 0; index < shuffledParents.length; index += 2) {
      const parentA = shuffledParents[index];
      const parentB = shuffledParents[index + 1] ?? shuffledParents[0];
      const crossover = crossoverStep(parentA, parentB, generationConfig.crossoverRate, this.rng);

      if (crossover.used) {
        crossoverPairs += 1;
      }

      for (const genome of crossover.genomes) {
        const mutated = mutationStep(genome, this.config, generationConfig.mutationRate, this.rng);
        mutations += mutated.mutations;
        nextPopulation.push(mutated.genome);

        if (nextPopulation.length === this.config.populationSize) {
          break;
        }
      }
    }

    this.population = nextPopulation;
    this.generation += 1;

    return this.captureSnapshot({
      trigger: "step",
      meta: {
        crossoverPairs,
        mutations,
        mutationRate: generationConfig.mutationRate,
      },
    });
  }

  run(generations = this.config.maxGenerations) {
    let snapshot = this.lastSnapshot;

    for (let generation = 0; generation < generations; generation += 1) {
      snapshot = this.step();
    }

    return snapshot;
  }
}

export function runBatch(config = {}) {
  const batchConfig = { ...DEFAULT_CONFIG, ...config };
  const runCount = Math.max(1, Math.trunc(batchConfig.runs));
  const results = [];

  for (let index = 0; index < runCount; index += 1) {
    const seed = (batchConfig.seed ?? 2026) + index;
    const arena = new ConstraintGeneticArena({ ...batchConfig, seed });
    const finalSnapshot = arena.run(batchConfig.maxGenerations);
    results.push({
      run: index + 1,
      seed,
      generation: finalSnapshot.generation,
      best: finalSnapshot.bestEver,
      bestCost: finalSnapshot.bestEver.cost,
      violation: finalSnapshot.bestEver.violation,
      feasible: finalSnapshot.bestEver.feasible,
      distanceToKnown: Math.hypot(
        finalSnapshot.bestEver.genes[0] - KNOWN_OPTIMUM.genes[0],
        finalSnapshot.bestEver.genes[1] - KNOWN_OPTIMUM.genes[1],
      ),
    });
  }

  const costs = results.map((entry) => entry.bestCost);
  const violations = results.map((entry) => entry.violation);
  const feasibleRuns = results.filter((entry) => entry.feasible).length;

  return {
    config: batchConfig,
    results,
    summary: {
      runs: runCount,
      feasibleRuns,
      feasibilityRate: feasibleRuns / runCount,
      meanBestCost: average(costs),
      stdBestCost: standardDeviation(costs),
      meanViolation: average(violations),
      stdViolation: standardDeviation(violations),
      bestCost: Math.min(...costs),
      worstCost: Math.max(...costs),
    },
  };
}
