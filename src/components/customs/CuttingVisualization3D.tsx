"use client";
import React, { useRef, useEffect } from 'react';
import type { CuttingPattern, DetailedCut } from '@/types/CuttingStock';

interface CuttingVisualization3DProps {
  patterns: CuttingPattern[];
  detailedCuts: DetailedCut[];
  selectedPattern?: number;
}

export default function CuttingVisualization3D({ 
  patterns, 
  detailedCuts, 
  selectedPattern 
}: CuttingVisualization3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw 3D-style bars with cuts
    drawCuttingPatterns(ctx, patterns, detailedCuts, selectedPattern);
  }, [patterns, detailedCuts, selectedPattern]);

  const drawCuttingPatterns = (
    ctx: CanvasRenderingContext2D, 
    patterns: CuttingPattern[], 
    detailedCuts: DetailedCut[], 
    selectedPattern?: number
  ) => {
    const barHeight = 40;
    const barSpacing = 60;
    const scale = 30; // pixels per meter
    
    patterns.forEach((pattern, index) => {
      const y = index * barSpacing + 50;
      const isSelected = selectedPattern === index;
      
      // Draw bar background (12m standard bar)
      ctx.fillStyle = isSelected ? '#e3f2fd' : '#f5f5f5';
      ctx.fillRect(50, y, 12 * scale, barHeight);
      
      // Draw 3D effect
      ctx.fillStyle = isSelected ? '#bbdefb' : '#e0e0e0';
      ctx.fillRect(50, y - 5, 12 * scale, 5); // Top face
      ctx.fillRect(50 + 12 * scale, y - 5, 5, barHeight + 5); // Right face
      
      // Draw cuts
      const detailedCut = detailedCuts[index];
      if (detailedCut) {
        detailedCut.cuts.forEach((cut, cutIndex) => {
          const x = 50 + cut.position * scale;
          const width = cut.length * scale;
          
          // Color code by bar type
          const colors = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0'];
          ctx.fillStyle = colors[cutIndex % colors.length];
          ctx.fillRect(x, y, width, barHeight);
          
          // Draw lap indicators
          if (cut.hasLap) {
            ctx.fillStyle = '#ff5722';
            ctx.fillRect(x + width - 2, y, 4, barHeight);
          }
          
          // Add text labels
          if (width > 30) { // Only if there's space
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
              `${cut.length.toFixed(1)}m`, 
              x + width / 2, 
              y + barHeight / 2 + 3
            );
          }
        });
      }
      
      // Draw waste area
      if (pattern.waste > 0.1) {
        const wasteX = 50 + (12 - pattern.waste) * scale;
        ctx.fillStyle = '#f44336';
        ctx.fillRect(wasteX, y, pattern.waste * scale, barHeight);
        
        // Waste label
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${pattern.waste.toFixed(2)}m`, 
          wasteX + (pattern.waste * scale) / 2, 
          y + barHeight / 2 + 3
        );
      }
      
      // Bar number and utilization
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Bar ${index + 1}`, 10, y + 20);
      ctx.fillText(`${pattern.utilization.toFixed(1)}%`, 10, y + 35);
    });
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        3D Cutting Pattern Visualization
      </h3>
      
      <div className="mb-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Cut Segments</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Waste</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span>Lap Joints</span>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={Math.max(400, patterns.length * 60 + 100)}
        className="border border-gray-200 rounded"
      />
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Click on bars to see detailed cutting instructions</p>
        <p>Scale: 1 meter = 30 pixels</p>
      </div>
    </div>
  );
}