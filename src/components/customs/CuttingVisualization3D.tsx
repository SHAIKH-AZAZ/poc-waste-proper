"use client";
import React, { useState } from 'react';
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
    const [hoveredBar, setHoveredBar] = useState<number | null>(null);

    const getColorForCut = (cutIndex: number): string => {
        const colors = [
            '#4CAF50', // Green
            '#2196F3', // Blue  
            '#FF9800', // Orange
            '#E91E63', // Pink
            '#9C27B0', // Purple
            '#00BCD4', // Cyan
            '#795548', // Brown
            '#607D8B', // Blue Grey
            '#FF5722', // Deep Orange
            '#3F51B5'  // Indigo
        ];
        return colors[cutIndex % colors.length];
    };

    const renderBarDiagram = (pattern: CuttingPattern, detailedCut: DetailedCut, barIndex: number) => {
        const totalWidth = 600; // Total width for 12m bar
        const barHeight = 50;
        const scale = totalWidth / 12; // pixels per meter

        return (
            <div
                key={barIndex}
                className={`mb-6 p-4 rounded-lg border-2 transition-all duration-200 ${selectedPattern === barIndex
                        ? 'border-blue-500 bg-blue-50'
                        : hoveredBar === barIndex
                            ? 'border-gray-400 bg-gray-50'
                            : 'border-gray-200 bg-white'
                    }`}
                onMouseEnter={() => setHoveredBar(barIndex)}
                onMouseLeave={() => setHoveredBar(null)}
            >
                {/* Bar Header */}
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-4">
                        <h4 className="text-lg font-bold text-gray-800">
                            Bar #{barIndex + 1}
                        </h4>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            {pattern.utilization.toFixed(1)}% Utilized
                        </span>
                    </div>
                    <div className="text-sm text-gray-600">
                        <span className="font-medium">Waste: </span>
                        <span className={`font-bold ${pattern.waste > 1 ? 'text-red-600' : 'text-green-600'}`}>
                            {pattern.waste.toFixed(2)}m
                        </span>
                    </div>
                </div>

                {/* Visual Bar Diagram */}
                <div className="relative">
                    {/* 12m Bar Background */}
                    <div
                        className="relative bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden"
                        style={{ width: totalWidth, height: barHeight }}
                    >
                        {/* Meter Markings */}
                        <div className="absolute inset-0 flex">
                            {Array.from({ length: 12 }, (_, i) => (
                                <div
                                    key={i}
                                    className="border-r border-gray-300 flex-1 flex items-center justify-center text-xs text-gray-500"
                                >
                                    {i + 1}m
                                </div>
                            ))}
                        </div>

                        {/* Cut Segments */}
                        {detailedCut.cuts.map((cut, cutIndex) => {
                            const x = cut.position * scale;
                            const width = cut.length * scale;
                            const color = getColorForCut(cutIndex);

                            return (
                                <div
                                    key={cutIndex}
                                    className="absolute top-0 bottom-0 border-r-2 border-white flex items-center justify-center text-white font-bold text-sm shadow-sm"
                                    style={{
                                        left: x,
                                        width: width,
                                        backgroundColor: color,
                                        zIndex: 10
                                    }}
                                    title={`${cut.barCode} - ${cut.length.toFixed(2)}m${cut.hasLap ? ' (with lap)' : ''}`}
                                >
                                    {width > 40 && (
                                        <span className="text-xs font-bold drop-shadow-sm">
                                            {cut.length.toFixed(1)}m
                                        </span>
                                    )}

                                    {/* Lap Joint Indicator */}
                                    {cut.hasLap && (
                                        <div
                                            className="absolute right-0 top-0 bottom-0 w-1 bg-red-500 opacity-80"
                                            title={`Lap Joint: ${cut.lapLength.toFixed(2)}m`}
                                        />
                                    )}
                                </div>
                            );
                        })}

                        {/* Waste Area */}
                        {pattern.waste > 0.01 && (
                            <div
                                className="absolute top-0 bottom-0 bg-red-400 flex items-center justify-center text-white font-bold text-sm"
                                style={{
                                    right: 0,
                                    width: pattern.waste * scale,
                                    zIndex: 10
                                }}
                                title={`Waste: ${pattern.waste.toFixed(2)}m`}
                            >
                                {pattern.waste * scale > 30 && (
                                    <span className="text-xs font-bold drop-shadow-sm">
                                        WASTE
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Length Scale */}
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0m</span>
                        <span>3m</span>
                        <span>6m</span>
                        <span>9m</span>
                        <span>12m</span>
                    </div>
                </div>

                {/* Cut Details */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {detailedCut.cuts.map((cut, cutIndex) => (
                        <div
                            key={cutIndex}
                            className="flex items-center gap-3 p-2 bg-gray-50 rounded border"
                        >
                            <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: getColorForCut(cutIndex) }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="font-mono text-sm font-medium text-blue-700 truncate">
                                    {cut.barCode}
                                </div>
                                <div className="text-xs text-gray-600">
                                    {cut.length.toFixed(2)}m
                                    {cut.hasLap && (
                                        <span className="ml-1 px-1 bg-orange-100 text-orange-700 rounded text-xs">
                                            +{cut.lapLength.toFixed(2)}m lap
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (!patterns.length || !detailedCuts.length) {
        return (
            <div className="w-full bg-gray-50 rounded-lg p-8 text-center">
                <div className="text-gray-500 text-lg">No cutting patterns to display</div>
                <div className="text-gray-400 text-sm mt-2">Select a diameter to see cutting diagrams</div>
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-lg shadow-lg p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                    Bar Cutting Diagrams
                </h3>
                <div className="text-sm text-gray-600">
                    <span className="font-medium">{patterns.length}</span> bars total
                </div>
            </div>

            {/* Legend */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Legend:</h4>
                <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span>Cut Segments</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-400 rounded"></div>
                        <span>Waste Material</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-red-500"></div>
                        <span>Lap Joints</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 rounded"></div>
                        <span>Selected Bar</span>
                    </div>
                </div>
            </div>

            {/* Bar Diagrams */}
            <div className="space-y-4">
                {patterns.map((pattern, index) =>
                    renderBarDiagram(pattern, detailedCuts[index], index)
                )}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">Summary:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-blue-600">Total Bars:</span>
                        <span className="ml-2 font-bold">{patterns.length}</span>
                    </div>
                    <div>
                        <span className="text-blue-600">Total Waste:</span>
                        <span className="ml-2 font-bold">
                            {patterns.reduce((sum, p) => sum + p.waste, 0).toFixed(2)}m
                        </span>
                    </div>
                    <div>
                        <span className="text-blue-600">Avg Utilization:</span>
                        <span className="ml-2 font-bold">
                            {(patterns.reduce((sum, p) => sum + p.utilization, 0) / patterns.length).toFixed(1)}%
                        </span>
                    </div>
                    <div>
                        <span className="text-blue-600">Total Cuts:</span>
                        <span className="ml-2 font-bold">
                            {detailedCuts.reduce((sum, d) => sum + d.cuts.length, 0)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}