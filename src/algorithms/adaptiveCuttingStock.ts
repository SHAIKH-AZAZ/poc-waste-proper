import type {
  MultiBarCuttingRequest,
  BarSegment,
  CuttingStockResult,
} from "@/types/CuttingStock";
import { CuttingStockPreprocessor } from "@/utils/cuttingStockPreprocessor";
import { GreedyCuttingStock } from "./greedyCuttingStock";
import { TrueDynamicCuttingStock } from "./trueDynamicCuttingStock";
import { BranchAndBoundCuttingStock } from "./branchAndBoundCuttingStock";

interface DatasetCharacteristics {
  totalSegments: number;
  uniqueSegmentTypes: number;
  averageSegmentLength: number;
  lengthVariance: number;
  maxDemandPerType: number;
  complexityScore: number;
}

interface AlgorithmRecommendation {
  primary: string;
  secondary?: string;
  reason: string;
  expectedQuality: "optimal" | "near-optimal" | "good" | "fair";
  expectedTime: "fast" | "medium" | "slow";
}

export class AdaptiveCuttingStock {
  private readonly STANDARD_LENGTH = 12.0;
  private preprocessor = new CuttingStockPreprocessor();
  
  // Algorithm instances
  private greedy = new GreedyCuttingStock();
  private trueDynamic = new TrueDynamicCuttingStock();
  private branchBound = new BranchAndBoundCuttingStock();

  /**
   * Automatically selects and runs the best algorithm(s) based on dataset characteristics
   */
  async solve(requests: MultiBarCuttingRequest[], dia: number): Promise<CuttingStockResult[]> {
    const startTime = performance.now();

    // Filter by diameter
    const diaRequests = this.preprocessor.filterByDia(requests, dia);

    if (diaRequests.length === 0) {
      return [this.createEmptyResult(dia, startTime)];
    }

    // Analyze dataset characteristics
    const allSegments = this.preprocessor.extractAllSegments(diaRequests);
    const characteristics = this.analyzeDataset(allSegments);
    
    console.log(`[Adaptive] Dataset characteristics:`, characteristics);

    // Get algorithm recommendation
    const recommendation = this.recommendAlgorithm(characteristics);
    
    console.log(`[Adaptive] Recommendation:`, recommendation);

    // Run recommended algorithm(s)
    const results = await this.runRecommendedAlgorithms(
      requests, 
      dia, 
      recommendation, 
      characteristics
    );

    return results;
  }

  /**
   * Analyze dataset to determine optimal algorithm
   */
  private analyzeDataset(segments: BarSegment[]): DatasetCharacteristics {
    const totalSegments = segments.length;
    const uniqueTypes = new Set(segments.map(s => s.segmentId)).size;
    
    // Calculate length statistics
    const lengths = segments.map(s => s.length);
    const averageLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - averageLength, 2), 0) / lengths.length;
    
    // Calculate demand per type
    const demandCounts = new Map<string, number>();
    segments.forEach(seg => {
      const count = demandCounts.get(seg.segmentId) || 0;
      demandCounts.set(seg.segmentId, count + 1);
    });
    const maxDemand = Math.max(...Array.from(demandCounts.values()));
    
    // Calculate complexity score
    const complexityScore = this.calculateComplexityScore(
      totalSegments, 
      uniqueTypes, 
      variance, 
      maxDemand
    );

    return {
      totalSegments,
      uniqueSegmentTypes: uniqueTypes,
      averageSegmentLength: Math.round(averageLength * 1000) / 1000,
      lengthVariance: Math.round(variance * 1000) / 1000,
      maxDemandPerType: maxDemand,
      complexityScore: Math.round(complexityScore * 100) / 100
    };
  }

  /**
   * Calculate complexity score (0-1, higher = more complex)
   */
  private calculateComplexityScore(
    totalSegments: number,
    uniqueTypes: number,
    variance: number,
    maxDemand: number
  ): number {
    // Normalize factors
    const sizeScore = Math.min(totalSegments / 100, 1); // 0-1
    const typeScore = Math.min(uniqueTypes / 20, 1); // 0-1
    const varianceScore = Math.min(variance / 10, 1); // 0-1
    const demandScore = Math.min(maxDemand / 50, 1); // 0-1
    
    // Weighted combination
    return (sizeScore * 0.3 + typeScore * 0.3 + varianceScore * 0.2 + demandScore * 0.2);
  }

  /**
   * Recommend best algorithm based on characteristics
   */
  private recommendAlgorithm(chars: DatasetCharacteristics): AlgorithmRecommendation {
    const { totalSegments, uniqueSegmentTypes, complexityScore } = chars;

    // Very small datasets: Branch and Bound for optimal solution
    if (totalSegments <= 20 && uniqueSegmentTypes <= 6) {
      return {
        primary: "branch-and-bound",
        secondary: "true-dynamic",
        reason: "Small dataset suitable for exact optimization",
        expectedQuality: "optimal",
        expectedTime: "medium"
      };
    }

    // Small-medium datasets with low complexity: True Dynamic Programming
    if (totalSegments <= 50 && uniqueSegmentTypes <= 10 && complexityScore < 0.6) {
      return {
        primary: "true-dynamic",
        secondary: "greedy",
        reason: "Medium dataset with manageable state space",
        expectedQuality: "near-optimal",
        expectedTime: "medium"
      };
    }

    // Medium datasets with high complexity: Column Generation
    if (totalSegments <= 200 && complexityScore >= 0.6) {
      return {
        primary: "true-dynamic", // Will use column generation internally
        secondary: "greedy",
        reason: "Complex dataset requiring advanced techniques",
        expectedQuality: "near-optimal",
        expectedTime: "slow"
      };
    }

    // Large datasets: Enhanced Greedy
    if (totalSegments > 200) {
      return {
        primary: "greedy",
        reason: "Large dataset requiring fast processing",
        expectedQuality: "good",
        expectedTime: "fast"
      };
    }

    // Default: True Dynamic Programming
    return {
      primary: "true-dynamic",
      secondary: "greedy",
      reason: "Balanced approach for general case",
      expectedQuality: "near-optimal",
      expectedTime: "medium"
    };
  }

  /**
   * Run recommended algorithms
   */
  private async runRecommendedAlgorithms(
    requests: MultiBarCuttingRequest[],
    dia: number,
    recommendation: AlgorithmRecommendation,
    characteristics: DatasetCharacteristics
  ): Promise<CuttingStockResult[]> {
    const results: CuttingStockResult[] = [];

    try {
      // Run primary algorithm
      console.log(`[Adaptive] Running primary algorithm: ${recommendation.primary}`);
      const primaryResult = await this.runAlgorithm(recommendation.primary, requests, dia);
      results.push(primaryResult);

      // Run secondary algorithm if specified and time permits
      if (recommendation.secondary && primaryResult.executionTime < 5000) {
        console.log(`[Adaptive] Running secondary algorithm: ${recommendation.secondary}`);
        const secondaryResult = await this.runAlgorithm(recommendation.secondary, requests, dia);
        results.push(secondaryResult);
      }

      // For small datasets, also run greedy for comparison
      if (characteristics.totalSegments <= 50 && !results.some(r => r.algorithm === "greedy")) {
        console.log(`[Adaptive] Running greedy for comparison`);
        const greedyResult = await this.runAlgorithm("greedy", requests, dia);
        results.push(greedyResult);
      }

    } catch (error) {
      console.error(`[Adaptive] Error running algorithms:`, error);
      
      // Fallback to greedy if other algorithms fail
      if (!results.some(r => r.algorithm === "greedy")) {
        console.log(`[Adaptive] Falling back to greedy algorithm`);
        const fallbackResult = await this.runAlgorithm("greedy", requests, dia);
        results.push(fallbackResult);
      }
    }

    // Sort results by quality (bars used, then waste)
    results.sort((a, b) => {
      if (a.totalBarsUsed !== b.totalBarsUsed) {
        return a.totalBarsUsed - b.totalBarsUsed;
      }
      return a.totalWaste - b.totalWaste;
    });

    return results;
  }

  /**
   * Run specific algorithm
   */
  private async runAlgorithm(
    algorithmName: string, 
    requests: MultiBarCuttingRequest[], 
    dia: number
  ): Promise<CuttingStockResult> {
    switch (algorithmName) {
      case "greedy":
        return this.greedy.solve(requests, dia);
      
      case "true-dynamic":
        return this.trueDynamic.solve(requests, dia);
      
      case "branch-and-bound":
        return this.branchBound.solve(requests, dia);
      
      default:
        throw new Error(`Unknown algorithm: ${algorithmName}`);
    }
  }

  /**
   * Get algorithm comparison and recommendation
   */
  getAlgorithmComparison(results: CuttingStockResult[]): {
    best: CuttingStockResult;
    comparison: Array<{
      algorithm: string;
      barsUsed: number;
      waste: number;
      utilization: number;
      executionTime: number;
      quality: string;
    }>;
    recommendation: string;
  } {
    if (results.length === 0) {
      throw new Error("No results to compare");
    }

    const best = results[0]; // Already sorted by quality

    const comparison = results.map(result => ({
      algorithm: result.algorithm,
      barsUsed: result.totalBarsUsed,
      waste: Math.round(result.totalWaste * 1000) / 1000,
      utilization: Math.round(result.averageUtilization * 100) / 100,
      executionTime: Math.round(result.executionTime),
      quality: this.assessQuality(result, results)
    }));

    const recommendation = this.generateRecommendation(results);

    return {
      best,
      comparison,
      recommendation
    };
  }

  /**
   * Assess solution quality relative to other solutions
   */
  private assessQuality(result: CuttingStockResult, allResults: CuttingStockResult[]): string {
    const minBars = Math.min(...allResults.map(r => r.totalBarsUsed));
    const maxBars = Math.max(...allResults.map(r => r.totalBarsUsed));
    
    if (result.totalBarsUsed === minBars) {
      return "Optimal";
    } else if (result.totalBarsUsed <= minBars + 1) {
      return "Excellent";
    } else if (result.totalBarsUsed <= minBars + 2) {
      return "Good";
    } else {
      return "Fair";
    }
  }

  /**
   * Generate recommendation text
   */
  private generateRecommendation(results: CuttingStockResult[]): string {
    const best = results[0];
    const fastest = results.reduce((prev, curr) => 
      prev.executionTime < curr.executionTime ? prev : curr
    );

    if (best.algorithm === fastest.algorithm) {
      return `${best.algorithm} provides the best solution (${best.totalBarsUsed} bars) with good performance (${Math.round(best.executionTime)}ms).`;
    } else {
      const timeDiff = best.executionTime - fastest.executionTime;
      const barDiff = fastest.totalBarsUsed - best.totalBarsUsed;
      
      if (barDiff <= 1 && timeDiff > 1000) {
        return `${fastest.algorithm} is recommended for its speed (${Math.round(fastest.executionTime)}ms) with minimal quality loss (${barDiff} extra bars).`;
      } else {
        return `${best.algorithm} is recommended for optimal quality (${best.totalBarsUsed} bars, ${Math.round(best.totalWaste)}m waste) despite longer execution time.`;
      }
    }
  }

  /**
   * Create empty result
   */
  private createEmptyResult(dia: number, startTime: number): CuttingStockResult {
    return {
      algorithm: "adaptive",
      dia,
      patterns: [],
      totalBarsUsed: 0,
      totalWaste: 0,
      averageUtilization: 0,
      executionTime: performance.now() - startTime,
      summary: {
        totalStandardBars: 0,
        totalWasteLength: 0,
        totalWastePercentage: 0,
        averageUtilization: 0,
        patternCount: 0,
        totalCutsProduced: 0,
      },
      detailedCuts: [],
    };
  }
}