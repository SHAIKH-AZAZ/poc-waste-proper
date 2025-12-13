import type { CuttingStockResult, CuttingPattern } from '@/types/CuttingStock';

export interface CostParameters {
  materialCostPerMeter: number;    // Cost per meter of rebar
  cuttingCostPerCut: number;       // Labor cost per cut
  wastePenalty: number;            // Additional cost for waste (environmental/disposal)
  setupCostPerBar: number;         // Setup cost for each new bar
  transportCostPerBar: number;     // Transport cost per bar
  urgencyMultiplier: number;       // Rush job multiplier (1.0 = normal, 1.5 = rush)
}

export interface CostAnalysis {
  materialCost: number;
  laborCost: number;
  wasteCost: number;
  setupCost: number;
  transportCost: number;
  totalCost: number;
  costPerMeter: number;
  wastePercentage: number;
  efficiency: number;
  recommendations: string[];
}

export class CostOptimizer {
  private readonly STANDARD_LENGTH = 12.0;

  /**
   * Calculate comprehensive cost analysis for cutting stock result
   */
  calculateCostAnalysis(
    result: CuttingStockResult,
    costParams: CostParameters,
    totalRequiredLength: number
  ): CostAnalysis {
    const materialCost = this.calculateMaterialCost(result, costParams);
    const laborCost = this.calculateLaborCost(result, costParams);
    const wasteCost = this.calculateWasteCost(result, costParams);
    const setupCost = this.calculateSetupCost(result, costParams);
    const transportCost = this.calculateTransportCost(result, costParams);

    const totalCost = (materialCost + laborCost + wasteCost + setupCost + transportCost) 
                     * costParams.urgencyMultiplier;

    const costPerMeter = totalCost / totalRequiredLength;
    const wastePercentage = (result.totalWaste / (result.totalBarsUsed * this.STANDARD_LENGTH)) * 100;
    const efficiency = (totalRequiredLength / (result.totalBarsUsed * this.STANDARD_LENGTH)) * 100;

    const recommendations = this.generateRecommendations(result, costParams, {
      materialCost,
      laborCost,
      wasteCost,
      setupCost,
      transportCost,
      totalCost,
      costPerMeter,
      wastePercentage,
      efficiency,
      recommendations: []
    });

    return {
      materialCost,
      laborCost,
      wasteCost,
      setupCost,
      transportCost,
      totalCost,
      costPerMeter,
      wastePercentage,
      efficiency,
      recommendations
    };
  }

  /**
   * Compare multiple algorithms by cost-effectiveness
   */
  compareAlgorithmsByCost(
    results: CuttingStockResult[],
    costParams: CostParameters,
    totalRequiredLength: number
  ): Array<{ algorithm: string; analysis: CostAnalysis; ranking: number }> {
    const analyses = results.map(result => ({
      algorithm: result.algorithm,
      analysis: this.calculateCostAnalysis(result, costParams, totalRequiredLength),
      ranking: 0
    }));

    // Sort by total cost and assign rankings
    analyses.sort((a, b) => a.analysis.totalCost - b.analysis.totalCost);
    analyses.forEach((item, index) => {
      item.ranking = index + 1;
    });

    return analyses;
  }

  /**
   * Optimize cost parameters to find best balance
   */
  optimizeCostParameters(
    result: CuttingStockResult,
    baseParams: CostParameters,
    totalRequiredLength: number
  ): { optimizedParams: CostParameters; savings: number; analysis: CostAnalysis } {
    const baseAnalysis = this.calculateCostAnalysis(result, baseParams, totalRequiredLength);
    
    // Try different parameter combinations to minimize cost
    let bestParams = { ...baseParams };
    let bestCost = baseAnalysis.totalCost;
    let bestAnalysis = baseAnalysis;

    // Optimize waste penalty (sometimes lower penalty leads to better overall cost)
    for (let wastePenalty = baseParams.wastePenalty * 0.5; 
         wastePenalty <= baseParams.wastePenalty * 2; 
         wastePenalty += baseParams.wastePenalty * 0.1) {
      
      const testParams = { ...baseParams, wastePenalty };
      const testAnalysis = this.calculateCostAnalysis(result, testParams, totalRequiredLength);
      
      if (testAnalysis.totalCost < bestCost) {
        bestCost = testAnalysis.totalCost;
        bestParams = testParams;
        bestAnalysis = testAnalysis;
      }
    }

    return {
      optimizedParams: bestParams,
      savings: baseAnalysis.totalCost - bestCost,
      analysis: bestAnalysis
    };
  }

  private calculateMaterialCost(result: CuttingStockResult, params: CostParameters): number {
    return result.totalBarsUsed * this.STANDARD_LENGTH * params.materialCostPerMeter;
  }

  private calculateLaborCost(result: CuttingStockResult, params: CostParameters): number {
    const totalCuts = result.detailedCuts.reduce((sum, detail) => sum + detail.cuts.length, 0);
    return totalCuts * params.cuttingCostPerCut;
  }

  private calculateWasteCost(result: CuttingStockResult, params: CostParameters): number {
    return result.totalWaste * params.materialCostPerMeter * params.wastePenalty;
  }

  private calculateSetupCost(result: CuttingStockResult, params: CostParameters): number {
    return result.totalBarsUsed * params.setupCostPerBar;
  }

  private calculateTransportCost(result: CuttingStockResult, params: CostParameters): number {
    return result.totalBarsUsed * params.transportCostPerBar;
  }

  private generateRecommendations(
    result: CuttingStockResult,
    params: CostParameters,
    analysis: CostAnalysis
  ): string[] {
    const recommendations: string[] = [];

    // Waste recommendations
    if (analysis.wastePercentage > 15) {
      recommendations.push("High waste detected. Consider using a more advanced algorithm for better optimization.");
    }

    if (analysis.wastePercentage > 25) {
      recommendations.push("Excessive waste! Review cutting requirements or consider alternative bar lengths.");
    }

    // Efficiency recommendations
    if (analysis.efficiency < 80) {
      recommendations.push("Low material efficiency. Consider batching similar cuts or adjusting cutting patterns.");
    }

    // Cost structure recommendations
    const costBreakdown = [
      { name: 'Material', cost: analysis.materialCost },
      { name: 'Labor', cost: analysis.laborCost },
      { name: 'Waste', cost: analysis.wasteCost },
      { name: 'Setup', cost: analysis.setupCost },
      { name: 'Transport', cost: analysis.transportCost }
    ];

    const maxCostComponent = costBreakdown.reduce((max, current) => 
      current.cost > max.cost ? current : max
    );

    if (maxCostComponent.name === 'Waste' && analysis.wasteCost > analysis.materialCost * 0.1) {
      recommendations.push("Waste cost is significant. Focus on waste reduction strategies.");
    }

    if (maxCostComponent.name === 'Labor' && analysis.laborCost > analysis.materialCost * 0.5) {
      recommendations.push("Labor cost is high. Consider automation or batch processing to reduce cutting operations.");
    }

    if (maxCostComponent.name === 'Transport' && analysis.transportCost > analysis.materialCost * 0.2) {
      recommendations.push("Transport cost is significant. Consider local suppliers or bulk ordering.");
    }

    // Algorithm-specific recommendations
    if (result.algorithm === 'greedy' && analysis.wastePercentage > 10) {
      recommendations.push("Greedy algorithm used. Try Dynamic Programming for potentially better results on smaller datasets.");
    }

    if (result.executionTime > 5000) { // 5 seconds
      recommendations.push("Long calculation time detected. Consider using faster algorithms for time-critical projects.");
    }

    return recommendations;
  }

  /**
   * Generate cost report for export
   */
  generateCostReport(
    analyses: Array<{ algorithm: string; analysis: CostAnalysis; ranking: number }>,
    costParams: CostParameters
  ): string {
    let report = "CUTTING STOCK COST ANALYSIS REPORT\n";
    report += "=====================================\n\n";

    report += "Cost Parameters:\n";
    report += `- Material Cost: $${costParams.materialCostPerMeter.toFixed(2)}/meter\n`;
    report += `- Cutting Cost: $${costParams.cuttingCostPerCut.toFixed(2)}/cut\n`;
    report += `- Waste Penalty: ${costParams.wastePenalty.toFixed(2)}x\n`;
    report += `- Setup Cost: $${costParams.setupCostPerBar.toFixed(2)}/bar\n`;
    report += `- Transport Cost: $${costParams.transportCostPerBar.toFixed(2)}/bar\n`;
    report += `- Urgency Multiplier: ${costParams.urgencyMultiplier.toFixed(2)}x\n\n`;

    analyses.forEach((item, index) => {
      const analysis = item.analysis;
      report += `${index + 1}. ${item.algorithm.toUpperCase()} ALGORITHM (Rank #${item.ranking})\n`;
      report += `   Total Cost: $${analysis.totalCost.toFixed(2)}\n`;
      report += `   Cost per Meter: $${analysis.costPerMeter.toFixed(2)}\n`;
      report += `   Efficiency: ${analysis.efficiency.toFixed(1)}%\n`;
      report += `   Waste: ${analysis.wastePercentage.toFixed(1)}%\n`;
      report += `   \n`;
      report += `   Cost Breakdown:\n`;
      report += `   - Material: $${analysis.materialCost.toFixed(2)}\n`;
      report += `   - Labor: $${analysis.laborCost.toFixed(2)}\n`;
      report += `   - Waste: $${analysis.wasteCost.toFixed(2)}\n`;
      report += `   - Setup: $${analysis.setupCost.toFixed(2)}\n`;
      report += `   - Transport: $${analysis.transportCost.toFixed(2)}\n`;
      report += `   \n`;
      
      if (analysis.recommendations.length > 0) {
        report += `   Recommendations:\n`;
        analysis.recommendations.forEach(rec => {
          report += `   - ${rec}\n`;
        });
      }
      report += `\n`;
    });

    return report;
  }
}