# Progress Tracking Implementation

## Overview
Added real-time progress tracking for cutting stock calculations with visual progress bars and stage indicators.

## Features Added

### 1. Progress Updates from Workers
- Workers send progress messages during calculation
- Stages tracked:
  - **Greedy**: Preprocessing → Sorting → Running FFD → Generating results
  - **Dynamic**: Preprocessing → Generating patterns → Running DP → Optimizing

### 2. Visual Progress Display
- **Dual progress bars** (one for each algorithm)
- **Percentage indicators** (0-100%)
- **Stage descriptions** (what's currently happening)
- **Color-coded** (Blue for Greedy, Green for Dynamic)
- **Smooth animations** with CSS transitions

### 3. Real-time Updates
- Progress updates every stage
- Non-blocking UI during calculations
- Parallel execution visible to user
- "Running algorithms in parallel using Web Workers..." message

## Implementation Details

### Worker Messages
```typescript
interface WorkerResponse {
  type: "greedy" | "dynamic";
  result?: CuttingStockResult;
  error?: string;
  progress?: {
    stage: string;
    percentage: number;
  };
}
```

### Progress Stages

**Greedy Algorithm:**
1. Preprocessing data... (10%)
2. Sorting segments... (30%)
3. Running First Fit Decreasing... (50%)
4. Generating results... (90%)
5. Complete (100%)

**Dynamic Programming:**
1. Preprocessing data... (10%)
2. Generating patterns... (30%)
3. Running dynamic programming... (60%)
4. Optimizing solution... (90%)
5. Complete (100%)

### UI Components

**Progress Bar Structure:**
```tsx
<div className="mb-6">
  <div className="flex items-center justify-between mb-2">
    <span>Algorithm Name</span>
    <span>Percentage</span>
  </div>
  <div className="w-full bg-gray-200 rounded-full h-3">
    <div 
      className="bg-blue-500 h-full transition-all"
      style={{ width: `${percentage}%` }}
    />
  </div>
  <p className="text-xs text-gray-600 mt-1">{stage}</p>
</div>
```

## User Experience

### Before Calculation
- User selects diameter
- Progress bars appear at 0%

### During Calculation
- Both progress bars update independently
- Stage descriptions show current operation
- Smooth animations between stages
- UI remains responsive

### After Calculation
- Progress bars reach 100%
- Results appear automatically
- Progress bars disappear

## Benefits

1. **Transparency** - Users see what's happening
2. **Confidence** - Visual feedback prevents confusion
3. **Performance insight** - See which algorithm is faster
4. **Better UX** - No "black box" waiting period
5. **Professional feel** - Modern, polished interface

## Technical Notes

- Progress updates don't block main thread
- Minimal performance overhead
- Works with any dataset size
- Graceful degradation if workers fail
- SSR-compatible (client-side only)

## Future Enhancements

1. **Estimated time remaining** based on dataset size
2. **Cancellation button** to stop calculations
3. **Detailed sub-stage progress** (e.g., "Processing segment 150/500")
4. **History tracking** of calculation times
5. **Performance metrics** display after completion
