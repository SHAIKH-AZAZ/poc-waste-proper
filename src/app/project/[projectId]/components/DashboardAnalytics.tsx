"use client";

import React from "react";
import { IconPackage, IconRecycle, IconChartPie } from "@tabler/icons-react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts";

interface Sheet {
    id: number;
    sheetNumber: number;
    fileName: string;
    fileSize: number | null;
    status: string;
    uploadedAt: string;
    mongoDataId: string | null;
    _count: {
        results: number;
        wasteProduced: number;
    };
    results: {
        id: number;
        dia: number;
        algorithm: string;
        totalBarsUsed: number;
        wastePiecesReused: number;
        totalWaste: number;
        averageUtilization: number;
    }[];
}

interface WasteItem {
    id: number;
    dia: number;
    length: number;
    status: string;
    sourceSheet: {
        id: number;
        sheetNumber: number;
        fileName: string;
    };
}

interface DashboardAnalyticsProps {
    sheets: Sheet[];
    waste: WasteItem[];
    formatLength: (mm: number) => string;
}

export default function DashboardAnalytics({ sheets, waste, formatLength }: DashboardAnalyticsProps) {
    // Aggregation logic
    const diaMap: { [key: number]: { count: number; waste: number; provided: number } } = {};
    let countTotal = 0;
    let piecesReused = 0;
    let weightWaste = 0;
    let totalLenProvided = 0;

    sheets.forEach((sheet) => {
        sheet.results.forEach((res) => {
            const d = res.dia;
            if (!diaMap[d]) {
                diaMap[d] = { count: 0, waste: 0, provided: 0 };
            }

            const barsUsed = Number(res.totalBarsUsed) || 0;

            // Calculate Net Waste: Original Waste - Reused Waste
            // We find all waste items produced by THIS sheet for THIS dia that are now 'used'
            const reusedWasteForLimit = waste.filter(w =>
                w.sourceSheet.id === sheet.id &&
                w.dia === d &&
                w.status === 'used'
            ).reduce((sum, w) => sum + w.length, 0);

            const originalWasteMeters = Number(res.totalWaste) || 0;
            const originalWasteMM = originalWasteMeters * 1000;

            // Net waste cannot be less than 0
            const netWasteMM = Math.max(0, originalWasteMM - reusedWasteForLimit);

            const reused = Number(res.wastePiecesReused) || 0;
            const util = Number(res.averageUtilization) || 0;

            // Provided = Waste / (1 - Util/100)
            // If util is 100%, waste is 0, so Provided = Used. 
            // In this case, we estimate Provided as total bars * 12m (conservative)
            let providedMM = 0;
            if (util >= 99.99) {
                providedMM = barsUsed * 12000;
            } else {
                providedMM = netWasteMM / (1 - util / 100);
            }

            diaMap[d].count += barsUsed;
            diaMap[d].waste += netWasteMM;
            diaMap[d].provided += providedMM;

            countTotal += barsUsed;
            piecesReused += reused;
            weightWaste += netWasteMM;
            totalLenProvided += providedMM;
        });
    });

    if (countTotal === 0) {
        return (
            <div className="lg:col-span-3 text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <IconChartPie className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-slate-900">No Analytics Yet</h3>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto">Run calculations on your project sheets to see material composition and efficiency metrics.</p>
            </div>
        );
    }

    const newBars = Math.max(0, countTotal - piecesReused);
    const lenUsed = Math.max(0, totalLenProvided - weightWaste);
    const utilRatio = totalLenProvided > 0 ? (lenUsed / totalLenProvided) * 100 : 0;
    const rRatio = countTotal > 0 ? (piecesReused / countTotal) * 100 : 0;

    // Actual savings = Total length of scrap pieces reused
    // This is total material provided minus new material bought
    const netSavingsMM = Math.max(0, totalLenProvided - (newBars * 12000));

    const palette = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];
    const diaData = Object.entries(diaMap).map(([dia, data], i) => ({
        name: `Dia ${dia}mm`,
        value: Number(data.count) || 0,
        waste: Number(data.waste) || 0,
        color: palette[i % palette.length]
    }));

    const effData = [
        { name: "Material Used", value: Number(lenUsed) || 0, color: "#4f46e5" },
        { name: "Net Waste", value: Number(weightWaste) || 0, color: "#cbd5e1" },
    ];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-2xl border border-slate-100 flex items-center gap-2 group animate-in fade-in zoom-in duration-200">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.color || payload[0].color }}></div>
                    <p className="text-[11px] font-black text-slate-900 whitespace-nowrap">
                        {payload[0].name}: <span className="text-indigo-600 ml-1">{payload[0].value}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const CustomEffTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-2xl border border-slate-100 flex items-center gap-2 group animate-in fade-in zoom-in duration-200">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.color || payload[0].color }}></div>
                    <p className="text-[11px] font-black text-slate-900 whitespace-nowrap">
                        {payload[0].name}: <span className="text-indigo-600 ml-1">{formatLength(payload[0].value)}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const CustomWasteTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-2xl border border-slate-100 flex flex-col gap-1 group animate-in fade-in zoom-in duration-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{payload[0].payload.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        <p className="text-[11px] font-black text-slate-900 whitespace-nowrap">
                            Waste produced: <span className="text-rose-600 ml-1">{formatLength(payload[0].value)}</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Material Chart */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center group/card transition-all hover:shadow-md">
                    <div className="w-full flex justify-between items-center mb-6">
                        <div className="flex flex-col">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Material Original</h3>
                            <p className="text-[10px] text-slate-400 font-medium">Distribution by diameter</p>
                        </div>
                        <IconPackage size={20} className="text-slate-300" />
                    </div>
                    <div className="w-full h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={diaData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={95}
                                    paddingAngle={4}
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={1200}
                                    stroke="none"
                                    isAnimationActive={true}
                                >
                                    {diaData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={<CustomTooltip />}
                                    isAnimationActive={false}
                                    offset={20}
                                    wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                            <p className="text-3xl font-black text-slate-900 leading-none">{countTotal}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Total Bars</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 w-full mt-6">
                        {diaData.map((d) => (
                            <div key={d.name} className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 transition-colors hover:bg-white hover:border-blue-100 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                                <p className="text-base font-black text-slate-900">{d.value}</p>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                                    {d.name}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Efficiency Chart */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center group/card transition-all hover:shadow-md">
                    <div className="w-full flex justify-between items-center mb-6">
                        <div className="flex flex-col">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Efficiency Ratio</h3>
                            <p className="text-[10px] text-slate-400 font-medium">Material usage percentage</p>
                        </div>
                        <IconRecycle size={20} className="text-slate-300" />
                    </div>
                    <div className="w-full h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={effData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={95}
                                    paddingAngle={8}
                                    dataKey="value"
                                    animationBegin={200}
                                    animationDuration={1200}
                                    stroke="none"
                                    isAnimationActive={true}
                                >
                                    {effData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={<CustomEffTooltip />}
                                    isAnimationActive={false}
                                    offset={20}
                                    wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                            <p className="text-3xl font-black text-indigo-600 leading-none">{utilRatio.toFixed(1)}%</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Utilization</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full mt-6">
                        {effData.map((d) => (
                            <div key={d.name} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                                <p className="text-xs font-bold text-slate-900 truncate" title={formatLength(d.value)}>{formatLength(d.value)}</p>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                                    {d.name.split(' ')[1] || d.name}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Waste Distribution Chart */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center group/card transition-all hover:shadow-md lg:col-span-1">
                    <div className="w-full flex justify-between items-center mb-6">
                        <div className="flex flex-col">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Waste produced</h3>
                            <p className="text-[10px] text-slate-400 font-medium">Total waste by diameter</p>
                        </div>
                        <IconRecycle size={20} className="text-rose-400" />
                    </div>
                    <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={diaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}m`}
                                />
                                <Tooltip
                                    content={<CustomWasteTooltip />}
                                    cursor={{ fill: '#f8fafc', radius: 10 }}
                                    isAnimationActive={false}
                                />
                                <Bar
                                    dataKey="waste"
                                    radius={[10, 10, 10, 10]}
                                    barSize={32}
                                >
                                    {diaData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} className="hover:fill-opacity-100 transition-opacity" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-full mt-6 bg-rose-50 p-4 rounded-2xl border border-rose-100">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Total wasted material</p>
                            <span className="text-rose-600 font-black text-lg">{formatLength(weightWaste)}</span>
                        </div>
                        <p className="text-[10px] text-rose-400 leading-relaxed font-medium">
                            This represents the net loss of material across all sheets for this project.
                        </p>
                    </div>
                </div>
            </div>

            {/* Savings Card Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-3xl text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                    <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 mb-6 font-medium">Savings Analysis</h4>
                    <div className="flex flex-col sm:flex-row gap-8">
                        <div>
                            <p className="text-4xl font-black">{piecesReused}</p>
                            <p className="text-xs font-medium opacity-80 mt-1">Waste pieces saved from landfill</p>
                        </div>
                        <div className="sm:border-l sm:border-white/10 sm:pl-8">
                            <p className="text-2xl font-bold">{rRatio.toFixed(1)}%</p>
                            <p className="text-xs font-medium opacity-80 mt-1">Project reuse ratio</p>
                        </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                            <IconRecycle size={20} />
                        </div>
                        <p className="text-[11px] font-semibold leading-tight opacity-90 max-w-xs">
                            You've optimized material use by prioritizing scrap reuse.
                        </p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-all flex flex-col justify-center gap-4 group/savings">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover/savings:scale-105 transition-transform">
                            <span className="text-xs font-black">SAVE</span>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Calculated Savings</p>
                            <p className="text-3xl font-black text-slate-900 group-hover/savings:text-emerald-600 transition-colors mt-1">
                                {formatLength(netSavingsMM)}
                            </p>
                        </div>
                    </div>
                    <div className="mt-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 font-medium">
                            The net length saved is calculated based on standard 12m bars minus the net waste generated.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
