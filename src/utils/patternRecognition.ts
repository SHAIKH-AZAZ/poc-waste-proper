import type { CuttingPattern, MultiBarCuttingRequest, BarSegment } from '@/types/CuttingStock';

export interface PatternSignature {
  id: string;
  lengths: number[];          // Sorted segment lengths
  frequency: number;          // How often this pattern appears
  efficiency: number;         // Average utilization
  projects: string[];         // Projects where this pattern was used
  lastUsed: Date;
  tags: string[];            // User-defined tags (e.g., "bridge", "building")
}

export interface PatternRecommendation {
  pattern: CuttingPattern;
  confidence: number;         // 0-1, how confident we are this is good
  reason: string;
  historicalPerformance: {
    averageUtilization: number;
    timesUsed: number;
    successRate: number;
  };
}

export class PatternRecognitionEngine {
  private patternDatabase: Map<string, PatternSignature> = new Map();
  private readonly SIMILARITY_THRESHOLD = 0.8;
  private readonly MIN_FREQUENCY_FOR_RECOMMENDATION = 3;

  /**
   * Learn from successful cutting patterns
   */
  learnFromPattern(
    pattern: CuttingPattern, 
    projectId: string, 
    tags: string[] = []
  ): void {
    const signature = this.createPatternSignature(pattern, projectId, tags);
    
    const existing = this.patternDatabase.get(signature.id);
    if (existing) {
      // Update existing pattern
      existing.frequency++;
      existing.efficiency = (existing.efficiency + pattern.utilization) / 2;
      existing.projects.push(projectId);
      existing.lastUsed = new Date();
      existing.tags = [...new Set([...existing.tags, ...tags])];
    } else {
      // Add new pattern
      this.patternDatabase.set(signature.id, signature);
    }
  }

  /**
   * Get pattern recommendations for current cutting requirements
   */
  getPatternRecommendations(
    segments: BarSegment[],
    projectTags: string[] = []
  ): PatternRecommendation[] {
    const recommendations: PatternRecommendation[] = [];
    
    // Analyze current requirements
    const currentLengths = segments.map(s => s.length).sort((a, b) => b - a);
    
    // Find similar patterns in database
    for (const [id, signature] of this.patternDatabase) {
      const similarity = this.calculatePatternSimilarity(currentLengths, signature.lengths);
      
      if (similarity >= this.SIMILARITY_THRESHOLD && 
          signature.frequency >= this.MIN_FREQUENCY_FOR_RECOMMENDATION) {
        
        // Check tag relevance
        const tagRelevance = this.calculateTagRelevance(projectTags, signature.tags);
        const confidence = (similarity * 0.7) + (tagRelevance * 0.3);
        
        // Create recommendation
        const pattern = this.reconstructPattern(signature);
        const recommendation: PatternRecommendation = {
          pattern,
          confidence,
          reason: this.generateRecommendationReason(signature, similarity, tagRelevance),
          historicalPerformance: {
            averageUtilization: signature.efficiency,
            timesUsed: signature.frequency,
            successRate: Math.min(signature.frequency / 10, 1.0) // Assume success rate based on usage
          }
        };
        
        recommendations.push(recommendation);
      }
    }
    
    // Sort by confidence
    return recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Analyze cutting requirements and suggest optimizations
   */
  analyzeRequirements(segments: BarSegment[]): {
    patterns: string[];
    suggestions: string[];
    riskFactors: string[];
  } {
    const analysis = {
      patterns: [] as string[],
      suggestions: [] as string[],
      riskFactors: [] as string[]
    };

    // Analyze length distribution
    const lengths = segments.map(s => s.length);
    const uniqueLengths = [...new Set(lengths)];
    const lengthCounts = new Map<number, number>();
    
    lengths.forEach(length => {
      lengthCounts.set(length, (lengthCounts.get(length) || 0) + 1);
    });

    // Identify patterns
    if (uniqueLengths.length === 1) {
      analysis.patterns.push("Uniform lengths - excellent for optimization");
    } else if (uniqueLengths.length / lengths.length < 0.3) {
      analysis.patterns.push("Low variety - good optimization potential");
    } else {
      analysis.patterns.push("High variety - challenging optimization");
    }

    // Generate suggestions
    const maxLength = Math.max(...lengths);
    const minLength = Math.min(...lengths);
    const avgLength = lengths.reduce((sum, l) => sum + l, 0) / lengths.length;

    if (maxLength > 10 && minLength < 2) {
      analysis.suggestions.push("Consider grouping very short and very long cuts separately");
    }

    if (avgLength < 4) {
      analysis.suggestions.push("Many short cuts detected - consider nested cutting patterns");
    }

    if (maxLength > 11) {
      analysis.suggestions.push("Long cuts detected - verify lap joint requirements");
    }

    // Identify risk factors
    const wasteRisk = this.calculateWasteRisk(lengths);
    if (wasteRisk > 0.7) {
      analysis.riskFactors.push("High waste risk due to length distribution");
    }

    const complexityRisk = uniqueLengths.length / lengths.length;
    if (complexityRisk > 0.5) {
      analysis.riskFactors.push("High complexity - may require advanced algorithms");
    }

    return analysis;
  }

  /**
   * Export pattern database for backup/sharing
   */
  exportPatternDatabase(): string {
    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      patterns: Array.from(this.patternDatabase.entries()).map(([id, signature]) => ({
        ...signature,
        lastUsed: signature.lastUsed.toISOString()
      }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import pattern database from backup
   */
  importPatternDatabase(jsonData: string): { success: boolean; imported: number; errors: string[] } {
    try {
      const data = JSON.parse(jsonData);
      const errors: string[] = [];
      let imported = 0;

      if (!data.patterns || !Array.isArray(data.patterns)) {
        return { success: false, imported: 0, errors: ["Invalid data format"] };
      }

      data.patterns.forEach((patternData: any, index: number) => {
        try {
          const signature: PatternSignature = {
            ...patternData,
            lastUsed: new Date(patternData.lastUsed)
          };
          
          this.patternDatabase.set(signature.id, signature);
          imported++;
        } catch (error) {
          errors.push(`Pattern ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      return { success: true, imported, errors };
    } catch (error) {
      return { 
        success: false, 
        imported: 0, 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }

  private createPatternSignature(
    pattern: CuttingPattern, 
    projectId: string, 
    tags: string[]
  ): PatternSignature {
    const lengths = pattern.cuts.map(cut => cut.length).sort((a, b) => b - a);
    const id = this.generatePatternId(lengths);
    
    return {
      id,
      lengths,
      frequency: 1,
      efficiency: pattern.utilization,
      projects: [projectId],
      lastUsed: new Date(),
      tags
    };
  }

  private generatePatternId(lengths: number[]): string {
    // Create a unique ID based on sorted lengths
    return lengths.map(l => l.toFixed(2)).join('-');
  }

  private calculatePatternSimilarity(lengths1: number[], lengths2: number[]): number {
    // Use Jaccard similarity with tolerance for floating point differences
    const tolerance = 0.05; // 5cm tolerance
    
    let matches = 0;
    const used = new Set<number>();
    
    for (const length1 of lengths1) {
      for (let i = 0; i < lengths2.length; i++) {
        if (used.has(i)) continue;
        
        if (Math.abs(length1 - lengths2[i]) <= tolerance) {
          matches++;
          used.add(i);
          break;
        }
      }
    }
    
    const union = lengths1.length + lengths2.length - matches;
    return union > 0 ? matches / union : 0;
  }

  private calculateTagRelevance(projectTags: string[], patternTags: string[]): number {
    if (projectTags.length === 0 || patternTags.length === 0) {
      return 0.5; // Neutral relevance
    }
    
    const intersection = projectTags.filter(tag => patternTags.includes(tag));
    const union = [...new Set([...projectTags, ...patternTags])];
    
    return intersection.length / union.length;
  }

  private generateRecommendationReason(
    signature: PatternSignature, 
    similarity: number, 
    tagRelevance: number
  ): string {
    let reason = `Similar pattern used ${signature.frequency} times`;
    
    if (similarity > 0.9) {
      reason += " with very high similarity";
    } else if (similarity > 0.8) {
      reason += " with high similarity";
    }
    
    if (tagRelevance > 0.7) {
      reason += " in similar projects";
    }
    
    if (signature.efficiency > 90) {
      reason += ". Historically very efficient";
    } else if (signature.efficiency > 80) {
      reason += ". Historically efficient";
    }
    
    return reason;
  }

  private reconstructPattern(signature: PatternSignature): CuttingPattern {
    // Reconstruct a basic pattern from signature
    // In a real implementation, you'd store more pattern details
    const cuts = signature.lengths.map((length, index) => ({
      segmentId: `reconstructed_${index}`,
      parentBarCode: `pattern_${signature.id}`,
      length,
      count: 1,
      segmentIndex: index,
      lapLength: 0
    }));
    
    const usedLength = signature.lengths.reduce((sum, length) => sum + length, 0);
    const waste = 12 - usedLength;
    
    return {
      id: `recommended_${signature.id}`,
      cuts,
      waste: Math.max(0, waste),
      utilization: signature.efficiency,
      standardBarLength: 12
    };
  }

  private calculateWasteRisk(lengths: number[]): number {
    // Simple heuristic: risk increases with length variety and small segments
    const maxLength = Math.max(...lengths);
    const minLength = Math.min(...lengths);
    const avgLength = lengths.reduce((sum, l) => sum + l, 0) / lengths.length;
    
    const varietyRisk = (maxLength - minLength) / 12; // Normalized by bar length
    const smallSegmentRisk = lengths.filter(l => l < 2).length / lengths.length;
    
    return Math.min(1, (varietyRisk + smallSegmentRisk) / 2);
  }
}