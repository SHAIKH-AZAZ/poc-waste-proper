import type { CuttingStockResult } from "@/types/CuttingStock";

export type ImplementedAlgorithmKey = CuttingStockResult["algorithm"];

export interface BarCuttingAlgorithmInfo {
  key: string;
  name: string;
  shortName: string;
  excelSheetName: string;
  description: string;
  bestFor: string;
  complexity: string;
  expectedQuality: string;
  implementedIn: string;
}

export const BAR_CUTTING_ALGORITHMS: BarCuttingAlgorithmInfo[] = [
  {
    key: "adaptive",
    name: "Adaptive Bar-Cutting Selector",
    shortName: "Adaptive selector",
    excelSheetName: "Adaptive Selector",
    description:
      "Inspects the cutting request size and length variety, then runs the most suitable implemented cutting-stock method.",
    bestFor: "Default production use when dataset size varies",
    complexity: "Variable",
    expectedQuality: "Best available",
    implementedIn: "src/algorithms/adaptiveCuttingStock.ts",
  },
  {
    key: "greedy",
    name: "Waste-Reuse First-Fit Decreasing",
    shortName: "FFD with waste reuse",
    excelSheetName: "FFD Waste Reuse",
    description:
      "Sorts cut segments longest-first, places each in the first feasible stock/offcut, and keeps same-parent lap segments apart.",
    bestFor: "Fast bar cutting with available waste/offcut reuse",
    complexity: "O(n x b)",
    expectedQuality: "Good baseline",
    implementedIn: "src/algorithms/greedyCuttingStock.ts",
  },
  {
    key: "dynamic",
    name: "Best-Fit Swap Cutting Optimization",
    shortName: "Best-fit + swap",
    excelSheetName: "BestFit Swap",
    description:
      "Uses the current worker route labelled dynamic; implementation builds a best-fit packing, reuses offcuts, then improves it with bar consolidation and swaps.",
    bestFor: "Main optimized bar-cutting result in this app",
    complexity: "Iterative heuristic",
    expectedQuality: "Very good",
    implementedIn: "src/algorithms/swapOptimization.ts",
  },
  {
    key: "improved-greedy",
    name: "Look-Ahead Combination Packing",
    shortName: "Look-ahead packing",
    excelSheetName: "LookAhead Packing",
    description:
      "Groups equal-length segments and searches for near-perfect stock-length combinations before falling back to best-fit packing.",
    bestFor: "Common mixes such as 6m + 4m + 2m where single-pass packing wastes stock",
    complexity: "Combination search",
    expectedQuality: "Very good",
    implementedIn: "src/algorithms/improvedGreedyCuttingStock.ts",
  },
  {
    key: "chunked",
    name: "Chunked Best-Fit Merge Optimization",
    shortName: "Chunked best-fit",
    excelSheetName: "Chunked BestFit",
    description:
      "Processes large segment lists in chunks with best-fit decreasing, then merges waste-heavy bins across chunks.",
    bestFor: "Large bar-cutting datasets that need bounded runtime",
    complexity: "Chunked O(n x b)",
    expectedQuality: "Good to very good",
    implementedIn: "src/algorithms/chunkedOptimization.ts",
  },
  {
    key: "swap",
    name: "Best-Fit Swap Consolidation",
    shortName: "Swap consolidation",
    excelSheetName: "Swap Consolidation",
    description:
      "Starts with best-fit decreasing, then applies one-to-one swaps, two-way swaps, and consolidation to reduce bars and waste.",
    bestFor: "Improving an initial bar-cutting layout after first packing",
    complexity: "Iterative heuristic",
    expectedQuality: "Very good",
    implementedIn: "src/algorithms/swapOptimization.ts",
  },
  {
    key: "true-dynamic",
    name: "Pattern DP Cutting-Stock Search",
    shortName: "Pattern DP search",
    excelSheetName: "Pattern DP Search",
    description:
      "Generates feasible cutting patterns and explores demand states with memoization; falls back to column generation for larger input.",
    bestFor: "Small to medium datasets where solution quality matters more than speed",
    complexity: "Exponential bounded",
    expectedQuality: "Near optimal",
    implementedIn: "src/algorithms/trueDynamicCuttingStock.ts",
  },
  {
    key: "column-generation",
    name: "Column Generation Pattern Search",
    shortName: "Column generation",
    excelSheetName: "Column Generation",
    description:
      "Generates additional cutting patterns iteratively, then solves the remaining demand as a set-cover style packing problem.",
    bestFor: "Larger inputs that are too big for full state-space search",
    complexity: "Iterative pattern generation",
    expectedQuality: "Near optimal",
    implementedIn: "src/algorithms/trueDynamicCuttingStock.ts",
  },
  {
    key: "branch-and-bound",
    name: "Branch-and-Bound Pattern Search",
    shortName: "Branch and bound",
    excelSheetName: "Branch Bound",
    description:
      "Generates feasible cutting patterns, then searches the pattern tree with lower-bound pruning to minimize bars.",
    bestFor: "Small datasets where exact search is acceptable",
    complexity: "Exponential bounded",
    expectedQuality: "Optimal when search completes",
    implementedIn: "src/algorithms/branchAndBoundCuttingStock.ts",
  },
  {
    key: "heuristic",
    name: "Branch-and-Bound Heuristic Fallback",
    shortName: "B&B heuristic",
    excelSheetName: "BB Heuristic",
    description:
      "Fallback packing path used when the branch-and-bound input is too large for exhaustive pattern-tree search.",
    bestFor: "Inputs beyond the exact branch-and-bound limits",
    complexity: "Heuristic",
    expectedQuality: "Good",
    implementedIn: "src/algorithms/branchAndBoundCuttingStock.ts",
  },
  {
    key: "waste-optimized",
    name: "Waste-First Pattern Ranking",
    shortName: "Waste-first ranking",
    excelSheetName: "Waste First",
    description:
      "Ranks cutting patterns by waste and prioritizes waste reduction, especially when offcut reuse is important.",
    bestFor: "Waste-sensitive bar cutting and offcut-heavy workflows",
    complexity: "Pattern ranking heuristic",
    expectedQuality: "Very good",
    implementedIn: "src/algorithms/wasteOptimizedCuttingStock.ts",
  },
];

export const RUNNABLE_BAR_CUTTING_ALGORITHM_KEYS = [
  "adaptive",
  "greedy",
  "dynamic",
  "improved-greedy",
  "chunked",
  "swap",
  "true-dynamic",
  "branch-and-bound",
] as const;

const ALGORITHM_INFO_BY_KEY = new Map(
  BAR_CUTTING_ALGORITHMS.map((algorithm) => [algorithm.key, algorithm])
);

export function normalizeAlgorithmKey(key: string | null | undefined): string {
  if (!key) return "";
  if (key === "branch-bound") return "branch-and-bound";
  return key;
}

export function getAlgorithmInfo(key: string | null | undefined): BarCuttingAlgorithmInfo {
  const normalizedKey = normalizeAlgorithmKey(key);
  const info = ALGORITHM_INFO_BY_KEY.get(normalizedKey);

  if (info) {
    return info;
  }

  const fallbackName = normalizedKey || "unknown";
  return {
    key: fallbackName,
    name: fallbackName,
    shortName: fallbackName,
    excelSheetName: fallbackName.slice(0, 31),
    description: "Implemented bar-cutting method.",
    bestFor: "Bar cutting optimization",
    complexity: "Unknown",
    expectedQuality: "Unknown",
    implementedIn: "Unknown",
  };
}

export function algorithmKeysMatch(resultKey: string, algorithmKey: string): boolean {
  const normalizedResult = normalizeAlgorithmKey(resultKey);
  const normalizedAlgorithm = normalizeAlgorithmKey(algorithmKey);

  return (
    normalizedResult === normalizedAlgorithm ||
    (normalizedAlgorithm === "true-dynamic" && normalizedResult === "column-generation") ||
    (normalizedAlgorithm === "branch-and-bound" && normalizedResult === "heuristic") ||
    (normalizedAlgorithm === "dynamic" && normalizedResult === "swap")
  );
}
