"use client";
import React from 'react';
import type { CuttingPattern, DetailedCut } from '@/types/CuttingStock';

interface CuttingVisualization3DProps {
    patterns: CuttingPattern[];
    detailedCuts: DetailedCut[];
}

export default function CuttingVisualization3D({
    patterns,
    detailedCuts
}: CuttingVisualization3DProps) {

    const getColorForCut = (cutIndex: number): string => {
        // Professional color palette with good contrast and visual distinction
        const colors = [
            '#3B82F6', // Bright Blue
            '#10B981', // Emerald Green
            '#F59E0B', // Amber Orange
            '#8B5CF6', // Violet Purple
            '#EF4444', // Red
            '#06B6D4', // Cyan
            '#84CC16', // Lime Green
            '#F97316', // Orange
            '#EC4899', // Pink
            '#6366F1', // Indigo
            '#14B8A6', // Teal
            '#A855F7'  // Purple
        ];
        return colors[cutIndex % colors.length];
    };

    const getUtilizationColor = (utilization: number): string => {
        if (utilization >= 90) return 'text-green-700 bg-green-100';
        if (utilization >= 75) return 'text-yellow-700 bg-yellow-100';
        if (utilization >= 60) return 'text-orange-700 bg-orange-100';
        return 'text-red-700 bg-red-100';
    };

    const getWasteColor = (waste: number): string => {
        if (waste <= 0.5) return 'text-green-600';
        if (waste <= 1.0) return 'text-yellow-600';
        if (waste <= 2.0) return 'text-orange-600';
        return 'text-red-600';
    };

    const renderBarDiagram = (pattern: CuttingPattern, detailedCut: DetailedCut, barIndex: number) => {
        const totalWidth = 800; // Total width for 12m bar
        const barHeight = 60;
        const scale = totalWidth / 12; // pixels per meter

        return (
            <div key={barIndex} className="mb-8 p-4 border border-gray-600 bg-gray-800">
                {/* Bar Header */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-white">Bar {barIndex + 1}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getUtilizationColor(pattern.utilization)}`}>
                            {pattern.utilization.toFixed(1)}% utilized
                        </span>
                    </div>
                    <div className="text-sm">
                        <span className="text-gray-300">Waste: </span>
                        <span className={`font-bold ${getWasteColor(pattern.waste)}`}>
                            {pattern.waste.toFixed(2)}m
                        </span>
                    </div>
                </div>

                {/* Visual Bar */}
                <div className="relative mb-4">
                    {/* Bar Background */}
                    <div
                        className="relative bg-gradient-to-b from-gray-700 to-gray-800 border-2 border-gray-500 rounded-md shadow-sm"
                        style={{ width: totalWidth, height: barHeight }}
                    >
                        {/* Meter Grid */}
                        <div className="absolute inset-0 flex">
                            {Array.from({ length: 12 }, (_, i) => (
                                <div
                                    key={i}
                                    className="border-r border-gray-500/50 flex-1 flex items-center justify-center text-xs font-medium text-gray-300"
                                >
                                    {i + 1}
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
                                    className="absolute top-0 bottom-0 flex items-center justify-center text-white text-sm font-bold shadow-md border-r border-white/30 hover:shadow-lg transition-shadow duration-200"
                                    style={{
                                        left: x,
                                        width: width,
                                        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                                        zIndex: 10
                                    }}
                                    title={`${cut.barCode}: ${cut.length.toFixed(2)}m${cut.hasLap ? ' + lap' : ''}`}
                                >
                                    {width > 50 && (
                                        <span className="drop-shadow-sm">{cut.length.toFixed(1)}m</span>
                                    )}

                                    {/* Lap Indicator */}
                                    {cut.hasLap && (
                                        <div
                                            className="absolute right-0 top-1 bottom-1 w-2 bg-gradient-to-b from-red-500 to-red-600 rounded-l-sm shadow-sm"
                                            title={`Lap Joint: ${cut.lapLength.toFixed(2)}m`}
                                        />
                                    )}
                                </div>
                            );
                        })}

                        {/* Waste Area */}
                        {pattern.waste > 0.01 && (
                            <div
                                className="absolute top-0 bottom-0 flex items-center justify-center text-white text-sm font-bold shadow-md"
                                style={{
                                    right: 0,
                                    width: pattern.waste * scale,
                                    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                                    zIndex: 10
                                }}
                                title={`Waste Material: ${pattern.waste.toFixed(2)}m`}
                            >
                                {/* Diagonal stripes pattern for waste */}
                                <div
                                    className="absolute inset-0 opacity-20"
                                    style={{
                                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.5) 4px, rgba(255,255,255,0.5) 8px)'
                                    }}
                                />
                                {pattern.waste * scale > 40 && (
                                    <span className="relative z-10 drop-shadow-sm">WASTE</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Scale */}
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>0m</span>
                        <span>6m</span>
                        <span>12m</span>
                    </div>
                </div>

                {/* Cut List */}
                <div className="text-sm bg-gray-700 p-3 rounded-md border border-gray-600">
                    <div className="font-semibold text-gray-200 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Cutting Instructions:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {detailedCut.cuts.map((cut, cutIndex) => (
                            <div key={cutIndex} className="flex items-center gap-3 p-2 bg-gray-800 rounded border border-gray-600 hover:border-gray-500 transition-colors">
                                <div
                                    className="w-4 h-4 rounded-sm shadow-sm border border-white/50"
                                    style={{ backgroundColor: getColorForCut(cutIndex) }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="font-mono text-sm font-semibold text-white truncate">
                                        {cut.barCode}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-300">
                                        <span className="font-medium">{cut.length.toFixed(2)}m</span>
                                        {cut.hasLap && (
                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                                                +{cut.lapLength.toFixed(2)}m lap
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    if (!patterns.length || !detailedCuts.length) {
        return (
            <div className="p-4 text-center text-gray-400 bg-gray-900">
                No cutting patterns available
            </div>
        );
    }

    return (
        <div className="w-full bg-gray-900 border border-gray-700 p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
                <h3 className="text-xl font-semibold text-white">
                    Cutting Patterns
                </h3>
                <div className="text-sm text-gray-400">
                    {patterns.length} bars • {detailedCuts.reduce((sum, d) => sum + d.cuts.length, 0)} cuts
                </div>
            </div>

            {/* Legend */}
            <div className="mb-6 p-4 bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 rounded-lg">
                <div className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Legend:
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-3 p-2 bg-gray-800 rounded border border-gray-600">
                        <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded shadow-sm"></div>
                        <span className="font-medium text-gray-300">Cut Segments</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-gray-800 rounded border border-gray-600">
                        <div className="w-5 h-5 bg-gradient-to-br from-red-500 to-red-600 rounded shadow-sm"></div>
                        <span className="font-medium text-gray-300">Waste Material</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-gray-800 rounded border border-gray-600">
                        <div className="relative">
                            <div className="w-6 h-5 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 border border-red-600 rounded-sm shadow-sm"></div>
                            <div className="absolute inset-0 opacity-40 rounded-sm"
                                style={{
                                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.8) 2px, rgba(255,255,255,0.8) 4px)'
                                }}
                            />
                            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-0.5 h-0.5 bg-gray-300 rounded-full" />
                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-0.5 h-0.5 bg-gray-300 rounded-full" />
                        </div>
                        <span className="font-medium text-gray-300">Lap Joint</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-gray-800 rounded border border-gray-600">
                        <div className="w-5 h-5 border-2 border-green-500 bg-green-900 rounded shadow-sm"></div>
                        <span className="font-medium text-gray-300">High Efficiency</span>
                    </div>
                </div>
            </div>

            {/* Bar Diagrams */}
            <div>
                {patterns.map((pattern, index) =>
                    renderBarDiagram(pattern, detailedCuts[index], index)
                )}
            </div>

            {/* Summary */}
            <div className="mt-6 pt-4 border-t-2 border-gray-700">
                <div className="mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-lg font-semibold text-white">Optimization Summary</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-600 rounded-lg">
                        <div className="text-2xl font-bold text-blue-300">{patterns.length}</div>
                        <div className="text-sm text-blue-400 font-medium">Total Bars</div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-red-900 to-red-800 border border-red-600 rounded-lg">
                        <div className="text-2xl font-bold text-red-300">
                            {patterns.reduce((sum, p) => sum + p.waste, 0).toFixed(1)}m
                        </div>
                        <div className="text-sm text-red-400 font-medium">Total Waste</div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-900 to-green-800 border border-green-600 rounded-lg">
                        <div className="text-2xl font-bold text-green-300">
                            {(patterns.reduce((sum, p) => sum + p.utilization, 0) / patterns.length).toFixed(1)}%
                        </div>
                        <div className="text-sm text-green-400 font-medium">Avg Utilization</div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-900 to-purple-800 border border-purple-600 rounded-lg">
                        <div className="text-2xl font-bold text-purple-300">
                            {detailedCuts.reduce((sum, d) => sum + d.cuts.length, 0)}
                        </div>
                        <div className="text-sm text-purple-400 font-medium">Total Cuts</div>
                    </div>
                </div>
            </div>
        </div>
    );
}