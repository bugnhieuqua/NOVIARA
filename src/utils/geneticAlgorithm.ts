import { Student, Group, GroupingConfig, GenerationStep, GroupingSession } from '../types';
import { calculateGroupMetrics, generateRuleExplanation } from './ruleExplainer';

export interface GARunResult {
  groups: Group[];
  overallFitness: number;
  convergenceHistory: GenerationStep[];
  executionTimeMs: number;
  totalGenerations: number;
}

// Evaluate a single chromosome (array mapping student index -> group index)
function evaluateChromosome(
  chromosome: number[],
  students: Student[],
  config: GroupingConfig,
  numGroups: number
): { fitness: number; violations: number; diversity: number } {
  // Partition students into groups
  const groupBins: Student[][] = Array.from({ length: numGroups }, () => []);
  for (let i = 0; i < chromosome.length; i++) {
    const gIdx = chromosome[i];
    if (gIdx >= 0 && gIdx < numGroups) {
      groupBins[gIdx].push(students[i]);
    }
  }

  let totalSkillScore = 0;
  let totalDiscScore = 0;
  let totalViolations = 0;
  const groupAvgGpas: number[] = [];

  // Group size penalty
  for (let g = 0; g < numGroups; g++) {
    const members = groupBins[g];
    const len = members.length;
    if (len < config.minMembers) {
      totalViolations += (config.minMembers - len) * 2;
    }
    if (len > config.maxMembers) {
      totalViolations += (len - config.maxMembers) * 2;
    }

    if (len === 0) continue;

    // Metrics
    const metrics = calculateGroupMetrics(members);
    totalSkillScore += metrics.skillBalanceScore;
    totalDiscScore += metrics.discDiversityScore;
    totalViolations += metrics.constraintViolations.length;
    groupAvgGpas.push(metrics.avgGpa);
  }

  const avgSkill = numGroups > 0 ? totalSkillScore / numGroups : 0;
  const avgDisc = numGroups > 0 ? totalDiscScore / numGroups : 0;

  // GPA balance across groups: variance of group average GPAs
  let gpaSpreadScore = 100;
  if (groupAvgGpas.length > 1) {
    const overallGpaMean = groupAvgGpas.reduce((a, b) => a + b, 0) / groupAvgGpas.length;
    const gpaSpreadVar = groupAvgGpas.reduce((sum, gpa) => sum + Math.pow(gpa - overallGpaMean, 2), 0) / groupAvgGpas.length;
    const gpaStdDev = Math.sqrt(gpaSpreadVar);
    // Lower standard deviation means more balanced groups
    gpaSpreadScore = Math.max(0, 100 - (gpaStdDev * 200));
  }

  // Weight composition
  const weights = config.fitnessWeights;
  const totalWeight = weights.skillBalance + weights.discDiversity + weights.gpaBalance + weights.genderBalance + weights.constraintSatisfaction;

  const wSkill = weights.skillBalance / totalWeight;
  const wDisc = weights.discDiversity / totalWeight;
  const wGpa = weights.gpaBalance / totalWeight;
  const wConstraint = weights.constraintSatisfaction / totalWeight;

  const rawFitness = (avgSkill * wSkill) + (avgDisc * wDisc) + (gpaSpreadScore * wGpa);
  const penalty = totalViolations * 6 * wConstraint;
  const finalFitness = Math.max(5, Math.min(100, Math.round(rawFitness - penalty)));

  return {
    fitness: finalFitness,
    violations: totalViolations,
    diversity: avgDisc,
  };
}

// Generate initial balanced chromosome
function generateRandomChromosome(numStudents: number, numGroups: number): number[] {
  const chromosome = new Array<number>(numStudents);
  // Distribute equally across groups first
  const groupAssignment: number[] = [];
  for (let i = 0; i < numStudents; i++) {
    groupAssignment.push(i % numGroups);
  }
  // Shuffle
  for (let i = groupAssignment.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [groupAssignment[i], groupAssignment[j]] = [groupAssignment[j], groupAssignment[i]];
  }
  return groupAssignment;
}

// Crossover two parents (Uniform partition crossover)
function crossover(parent1: number[], parent2: number[], rate: number): [number[], number[]] {
  if (Math.random() > rate) {
    return [[...parent1], [...parent2]];
  }
  const len = parent1.length;
  const child1 = new Array<number>(len);
  const child2 = new Array<number>(len);

  const crossoverPoint = Math.floor(Math.random() * (len - 1)) + 1;
  for (let i = 0; i < len; i++) {
    if (i < crossoverPoint) {
      child1[i] = parent1[i];
      child2[i] = parent2[i];
    } else {
      child1[i] = parent2[i];
      child2[i] = parent1[i];
    }
  }
  return [child1, child2];
}

// Mutate chromosome
function mutate(chromosome: number[], numGroups: number, mutationRate: number): number[] {
  const mutated = [...chromosome];
  const len = mutated.length;

  for (let i = 0; i < len; i++) {
    if (Math.random() < mutationRate) {
      // Either swap with another student or pick a new random group
      if (Math.random() < 0.6) {
        const targetIdx = Math.floor(Math.random() * len);
        const temp = mutated[i];
        mutated[i] = mutated[targetIdx];
        mutated[targetIdx] = temp;
      } else {
        mutated[i] = Math.floor(Math.random() * numGroups);
      }
    }
  }
  return mutated;
}

// Tournament selection
function tournamentSelect(
  population: { chromosome: number[]; fitness: number }[],
  tournamentSize: number
): number[] {
  let best = population[Math.floor(Math.random() * population.length)];
  for (let i = 1; i < tournamentSize; i++) {
    const contender = population[Math.floor(Math.random() * population.length)];
    if (contender.fitness > best.fitness) {
      best = contender;
    }
  }
  return [...best.chromosome];
}

// Main Genetic Algorithm Runner with progress callback for real-time visualization
export async function executeGeneticAlgorithm(
  students: Student[],
  config: GroupingConfig,
  onProgress?: (step: GenerationStep) => void
): Promise<GARunResult> {
  const startTime = performance.now();
  const numStudents = students.length;
  const numGroups = config.targetGroupCount || Math.ceil(numStudents / config.minMembers);

  const hyper = config.gaHyperparameters;
  const popSize = hyper.populationSize;
  const maxGens = hyper.generations;

  // Initialize Population
  let population: { chromosome: number[]; fitness: number; violations: number; diversity: number }[] = [];
  for (let i = 0; i < popSize; i++) {
    const chrom = generateRandomChromosome(numStudents, numGroups);
    const evalResult = evaluateChromosome(chrom, students, config, numGroups);
    population.push({ chromosome: chrom, ...evalResult });
  }

  const convergenceHistory: GenerationStep[] = [];
  let bestEver = population[0];

  for (let gen = 1; gen <= maxGens; gen++) {
    // Sort by fitness descending
    population.sort((a, b) => b.fitness - a.fitness);

    if (population[0].fitness > bestEver.fitness) {
      bestEver = { ...population[0] };
    }

    const currentBest = population[0];
    const avgFitness = Math.round(
      population.reduce((sum, ind) => sum + ind.fitness, 0) / popSize
    );

    const stepInfo: GenerationStep = {
      generation: gen,
      bestFitness: currentBest.fitness,
      avgFitness,
      diversity: currentBest.diversity,
      violations: currentBest.violations,
      timestamp: Date.now(),
    };
    convergenceHistory.push(stepInfo);

    if (onProgress && (gen % 5 === 0 || gen === maxGens || gen === 1)) {
      onProgress(stepInfo);
      // Small yield to let React render chart progress smoothly
      if (gen % 15 === 0) {
        await new Promise(r => setTimeout(r, 12));
      }
    }

    // Elitism: carry over top individuals
    const nextPopulation: typeof population = [];
    for (let e = 0; e < hyper.elitismCount; e++) {
      if (population[e]) {
        nextPopulation.push({ ...population[e] });
      }
    }

    // Fill remainder with crossover & mutation
    while (nextPopulation.length < popSize) {
      const p1 = tournamentSelect(population, hyper.tournamentSize);
      const p2 = tournamentSelect(population, hyper.tournamentSize);
      const [c1, c2] = crossover(p1, p2, hyper.crossoverRate);

      const m1 = mutate(c1, numGroups, hyper.mutationRate);
      const eval1 = evaluateChromosome(m1, students, config, numGroups);
      nextPopulation.push({ chromosome: m1, ...eval1 });

      if (nextPopulation.length < popSize) {
        const m2 = mutate(c2, numGroups, hyper.mutationRate);
        const eval2 = evaluateChromosome(m2, students, config, numGroups);
        nextPopulation.push({ chromosome: m2, ...eval2 });
      }
    }

    population = nextPopulation;
  }

  // Construct Final Groups from Best Chromosome
  const finalGroupBins: Student[][] = Array.from({ length: numGroups }, () => []);
  for (let i = 0; i < bestEver.chromosome.length; i++) {
    const gIdx = bestEver.chromosome[i];
    finalGroupBins[gIdx].push(students[i]);
  }

  const finalGroups: Group[] = finalGroupBins.map((members, idx) => {
    const metrics = calculateGroupMetrics(members);
    const explanation = generateRuleExplanation(members, metrics);
    const leaders = members.filter(m => m.isLeaderCandidate || m.disc.dominant === 'D');
    const leaderId = leaders.length > 0 ? leaders[0].id : (members[0]?.id || undefined);

    return {
      id: `GRP-${String(idx + 1).padStart(2, '0')}`,
      groupNumber: idx + 1,
      name: `Nhóm ${idx + 1}`,
      members,
      leaderId,
      metrics,
      explanation,
    };
  });

  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    groups: finalGroups,
    overallFitness: bestEver.fitness,
    convergenceHistory,
    executionTimeMs,
    totalGenerations: maxGens,
  };
}

// Helper to create an initial session for mock data
export function createDefaultSession(students: Student[], config: GroupingConfig): GroupingSession {
  const numGroups = config.targetGroupCount;
  const groupBins: Student[][] = Array.from({ length: numGroups }, () => []);
  
  // Smart deterministic seeding for realistic showcase
  students.forEach((st, i) => {
    groupBins[i % numGroups].push(st);
  });

  const groups: Group[] = groupBins.map((members, idx) => {
    const metrics = calculateGroupMetrics(members);
    const explanation = generateRuleExplanation(members, metrics);
    const leader = members.find(m => m.isLeaderCandidate || m.disc.dominant === 'D') || members[0];
    return {
      id: `GRP-${String(idx + 1).padStart(2, '0')}`,
      groupNumber: idx + 1,
      name: `Nhóm ${idx + 1}`,
      members,
      leaderId: leader?.id,
      metrics,
      explanation,
    };
  });

  // Prepopulate realistic convergence history curve
  const convergenceHistory: GenerationStep[] = [];
  let curFit = 48;
  for (let g = 1; g <= 120; g += 4) {
    curFit += Math.min(48, Math.round((92 - curFit) * 0.08 + Math.random() * 2));
    convergenceHistory.push({
      generation: g,
      bestFitness: Math.min(94, curFit),
      avgFitness: Math.max(35, curFit - Math.round(8 + Math.random() * 5)),
      diversity: Math.round(82 - (g * 0.1) + Math.random() * 4),
      violations: Math.max(0, Math.round(6 - (g / 20))),
    });
  }

  return {
    id: 'SES-2024-001',
    title: 'Phiên phân nhóm Đồ án HK1 - SE347.O21 (Chính thức)',
    classId: 'CLASS_SE347_K18',
    className: 'Công nghệ Phần mềm Nâng cao (K18)',
    createdAt: '2024-09-15 08:30',
    updatedAt: '2024-09-15 09:12',
    status: 'published',
    config,
    groups,
    totalStudents: students.length,
    overallFitness: 94,
    convergenceHistory,
    executionTimeMs: 1420,
  };
}
