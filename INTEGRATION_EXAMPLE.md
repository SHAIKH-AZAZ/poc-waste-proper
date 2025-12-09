# Integration Example - Live Progress Tracking in UI

## Overview

The waste optimization algorithm now integrates with React components to show **live progress** with real-time calculations and comparisons.

---

## Components Created

### 1. ProcessingProgress Component
**File:** `src/components/ProcessingProgress.tsx`

Displays:
- Progress bar with color-coded steps
- 8 real-time metric cards
- Execution time
- Processing status

### 2. Progress Emitter
**File:** `src/utils/progressEmitter.ts`

Provides:
- Event-based progress updates
- Singleton pattern for global access
- Methods to update each metric
- Subscribe/unsubscribe pattern

### 3. useProcessingProgress Hook
**File:** `src/hooks/useProcessingProgress.ts`

Allows:
- React components to subscribe to progress
- Real-time state updates
- Easy integration with UI

---

## Usage Example

### In a React Component

```typescript
'use client'

import { useState } from 'react'
import { ProcessingProgress } from '@/components/ProcessingProgress'
import { useProcessingProgress } from '@/hooks/useProcessingProgress'
import { WasteOptimizedCuttingStock } from '@/algorithms/wasteOptimizedCuttingStock'
import { progressEmitter } from '@/utils/progressEmitter'

export function CuttingStockPage() {
  const { stats, isProcessing } = useProcessingProgress()
  const [results, setResults] = useState(null)

  const handleProcess = async () => {
    progressEmitter.reset()
    progressEmitter.setStep('perfect')
    progressEmitter.setProgress(0)

    const optimizer = new WasteOptimizedCuttingStock()
    const result = await optimizer.solve(requests, 12)

    progressEmitter.setStep('complete')
    progressEmitter.setProgress(100)
    setResults(result)
  }

  return (
    <div className="space-y-6">
      {/* Progress Display */}
      <ProcessingProgress
        stats={stats}
        isProcessing={isProcessing}
        diameter={12}
        totalDiameters={3}
      />

      {/* Results */}
      {results && (
        <div className="bg-green-50 p-4 rounded">
          <h3>Results</h3>
          <p>Bars used: {results.totalBarsUsed}</p>
          <p>Waste: {results.totalWaste}m</p>
        </div>
      )}

      <button
        onClick={handleProcess}
        disabled={isProcessing}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {isProcessing ? 'Processing...' : 'Start Optimization'}
      </button>
    </div>
  )
}
```

---

## Live Progress Display

### Step 1: Perfect Combinations
```
🔍 Finding Perfect Combinations
Progress: 25%

Perfect Combinations: 23
Patterns Generated: 0
Waste Calculations: 0
DP States Explored: 0
DP Comparisons: 0
Memo Cache Hits: 0
Memo Entries: 0
Consolidation Checks: 0

Execution Time: 12.45ms
```

### Step 2: Pattern Generation
```
🎯 Generating Patterns
Progress: 50%

Perfect Combinations: 23
Patterns Generated: 15
Waste Calculations: 0
DP States Explored: 0
DP Comparisons: 0
Memo Cache Hits: 0
Memo Entries: 0
Consolidation Checks: 0

Execution Time: 37.89ms
```

### Step 3: DP Solving
```
🧮 Running DP Solver
Progress: 75%

Perfect Combinations: 23
Patterns Generated: 15
Waste Calculations: 0
DP States Explored: 7
DP Comparisons: 154
Memo Cache Hits: 0
Memo Entries: 7
Consolidation Checks: 0

Execution Time: 52.34ms
```

### Step 4: Complete
```
✨ Complete
Progress: 100%

Perfect Combinations: 23
Patterns Generated: 15
Waste Calculations: 0
DP States Explored: 7
DP Comparisons: 154
Memo Cache Hits: 0
Memo Entries: 7
Consolidation Checks: 0

Execution Time: 64.40ms
```

---

## Metric Explanations

### Perfect Combinations Checked
- **What:** Number of segment combinations evaluated
- **Why:** Shows search depth and efficiency
- **Good Range:** 10-100 for small datasets
- **Action:** If > 1,000,000, dataset is too large

### Patterns Generated
- **What:** Number of cutting patterns created
- **Why:** Indicates pattern diversity
- **Good Range:** 5-50 for small datasets
- **Action:** If > 300, consider using Greedy

### Waste Calculations
- **What:** Number of waste computations
- **Why:** Shows computational cost
- **Good Range:** 0-100
- **Action:** If > 10,000, optimize pattern generation

### DP States Explored
- **What:** Number of unique demand states
- **Why:** Indicates state space size
- **Good Range:** 1-100 for small datasets
- **Action:** If > 10,000, use Column Generation

### DP Comparisons
- **What:** Number of pattern comparisons
- **Why:** Shows optimization effort
- **Good Range:** 10-1,000 for small datasets
- **Action:** If > 1,000,000, use Greedy

### Memo Cache Hits
- **What:** Number of cached states reused
- **Why:** Shows memoization effectiveness
- **Good Range:** > 50% of states
- **Action:** If 0, memoization not helping

### Memo Entries
- **What:** Number of states in cache
- **Why:** Shows memory usage
- **Good Range:** < 15,000
- **Action:** If > 15,000, increase limit

### Consolidation Checks
- **What:** Number of waste consolidation attempts
- **Why:** Shows optimization opportunities
- **Good Range:** 0-100
- **Action:** If > 1,000, waste is fragmented

---

## Color Coding

### Progress Bar Colors
```
🔍 Perfect Combinations: Blue
🎯 Pattern Generation: Green
🧮 DP Solving: Yellow
🔄 Consolidation: Cyan
✨ Complete: Emerald
```

### Metric Card Colors
```
Perfect Combinations: Blue border
Patterns Generated: Green border
Waste Calculations: Yellow border
DP States: Cyan border
DP Comparisons: Purple border
Memo Hits: Pink border
Memo Entries: Indigo border
Consolidation: Orange border
```

---

## Integration Steps

### 1. Add to Your Page
```typescript
import { ProcessingProgress } from '@/components/ProcessingProgress'
import { useProcessingProgress } from '@/hooks/useProcessingProgress'

export function MyPage() {
  const { stats, isProcessing } = useProcessingProgress()
  
  return <ProcessingProgress stats={stats} isProcessing={isProcessing} />
}
```

### 2. Update Algorithm
```typescript
import { progressEmitter } from '@/utils/progressEmitter'

// In your algorithm:
progressEmitter.setStep('perfect')
progressEmitter.incrementPerfectCombinations()
progressEmitter.setProgress(25)
```

### 3. Handle Results
```typescript
progressEmitter.setStep('complete')
progressEmitter.setProgress(100)
// Display results
```

---

## Real-World Scenario

### Processing Multiple Diameters

```
Processing Dia 12 (1 of 3)
Progress: 33%

[Shows metrics for Dia 12]

Processing Dia 16 (2 of 3)
Progress: 66%

[Shows metrics for Dia 16]

Processing Dia 20 (3 of 3)
Progress: 100%

[Shows metrics for Dia 20]
```

---

## Performance Monitoring

### Fast Processing (< 50ms)
```
✅ Perfect Combinations: < 50
✅ Patterns Generated: < 10
✅ DP Comparisons: < 100
✅ Memo Entries: < 10
```

### Medium Processing (50-200ms)
```
⚠️  Perfect Combinations: 50-500
⚠️  Patterns Generated: 10-50
⚠️  DP Comparisons: 100-1,000
⚠️  Memo Entries: 10-100
```

### Slow Processing (> 200ms)
```
🔴 Perfect Combinations: > 500
🔴 Patterns Generated: > 50
🔴 DP Comparisons: > 1,000
🔴 Memo Entries: > 100
```

---

## Troubleshooting

### Progress Not Updating
```
Check:
1. progressEmitter is imported correctly
2. useProcessingProgress hook is used
3. Algorithm calls progressEmitter methods
```

### Metrics Always Zero
```
Check:
1. Algorithm is calling incrementer methods
2. progressEmitter.reset() called before processing
3. Component is subscribed to updates
```

### High Execution Time
```
Action:
1. Check DP Comparisons count
2. If > 1,000,000, use Greedy algorithm
3. Reduce pattern limit to 200
```

---

## Files Created

```
✅ src/components/ProcessingProgress.tsx
   - React component for progress display
   - 8 metric cards
   - Color-coded progress bar

✅ src/utils/progressEmitter.ts
   - Event emitter for progress updates
   - Singleton pattern
   - Subscribe/unsubscribe methods

✅ src/hooks/useProcessingProgress.ts
   - React hook for progress tracking
   - Real-time state updates
   - Easy component integration
```

---

## Next Steps

1. **Import components** in your page
2. **Use the hook** to get stats
3. **Display the component** in your UI
4. **Update algorithm** to emit progress
5. **Monitor metrics** during processing

The live progress tracking is now ready to use in your application!
