# Where Calculations Are Displayed

## Display Locations Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE (Browser)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Processing Progress Component                           │   │
│  │  ═══════════════════════════════════════════════════════ │   │
│  │                                                           │   │
│  │  Processing Dia 12 (1 of 3)                    50%       │   │
│  │  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  │  🧮 Running DP Solver                                    │   │
│  │                                                           │   │
│  │  ┌─────────────┬─────────────┬─────────────┬──────────┐ │   │
│  │  │ Perfect     │ Patterns    │ Waste       │ DP       │ │   │
│  │  │ Combos      │ Generated   │ Calcs       │ States   │ │   │
│  │  │ 23          │ 15          │ 0           │ 7        │ │   │
│  │  └─────────────┴─────────────┴─────────────┴──────────┘ │   │
│  │                                                           │   │
│  │  ┌─────────────┬─────────────┬─────────────┬──────────┐ │   │
│  │  │ DP          │ Memo Hits   │ Memo        │ Consol   │ │   │
│  │  │ Comparisons │             │ Entries     │ Checks   │ │   │
│  │  │ 154         │ 0           │ 7           │ 0        │ │   │
│  │  └─────────────┴─────────────┴─────────────┴──────────┘ │   │
│  │                                                           │   │
│  │  Execution Time: 64.40ms                                │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                              │ Updates via
                              │ progressEmitter
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  WasteOptimizedCuttingStock Algorithm                    │   │
│  │  ═══════════════════════════════════════════════════════ │   │
│  │                                                           │   │
│  │  STEP 1: Perfect Combinations                           │   │
│  │  ├─ perfectCombinationsChecked++                        │   │
│  │  ├─ progressEmitter.setStep('perfect')                 │   │
│  │  └─ progressEmitter.setProgress(25)                    │   │
│  │                                                           │   │
│  │  STEP 2: Pattern Generation                            │   │
│  │  ├─ patternsGenerated++                                │   │
│  │  ├─ wasteCalculations++                                │   │
│  │  ├─ progressEmitter.setStep('patterns')               │   │
│  │  └─ progressEmitter.setProgress(50)                   │   │
│  │                                                           │   │
│  │  STEP 3: DP Solving                                    │   │
│  │  ├─ dpStatesExplored++                                │   │
│  │  ├─ dpComparisons++                                   │   │
│  │  ├─ memoHits++                                        │   │
│  │  ├─ memoPuts++                                        │   │
│  │  ├─ progressEmitter.setStep('dp')                    │   │
│  │  └─ progressEmitter.setProgress(75)                  │   │
│  │                                                           │   │
│  │  STEP 4: Consolidation                                │   │
│  │  ├─ consolidationChecks++                             │   │
│  │  ├─ progressEmitter.setStep('consolidation')         │   │
│  │  └─ progressEmitter.setProgress(90)                  │   │
│  │                                                           │   │
│  │  COMPLETE                                              │   │
│  │  ├─ progressEmitter.setStep('complete')              │   │
│  │  └─ progressEmitter.setProgress(100)                 │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Console Output (Server Logs)                            │   │
│  │  ═══════════════════════════════════════════════════════ │   │
│  │                                                           │   │
│  │  [WasteOptimized] 🔍 STEP 1: Searching...             │   │
│  │  [WasteOptimized]    📊 Combinations checked: 23       │   │
│  │  [WasteOptimized] 🎯 STEP 2: Generating...            │   │
│  │  [WasteOptimized]    📊 Patterns created: 15           │   │
│  │  [WasteOptimized] 🧮 STEP 3: Running DP...            │   │
│  │  [WasteOptimized]    📊 States explored: 7             │   │
│  │  [WasteOptimized]    📊 Comparisons made: 154          │   │
│  │  [WasteOptimized] 🔄 STEP 4: Consolidating...         │   │
│  │  [WasteOptimized] ✨ PROCESSING COMPLETE              │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Algorithm Execution (Backend)
```
WasteOptimizedCuttingStock.solve()
    │
    ├─ progressEmitter.setStep('perfect')
    ├─ progressEmitter.setProgress(0)
    │
    ├─ findPerfectCombinations()
    │   └─ stats.perfectCombinationsChecked++
    │       └─ progressEmitter.emit()
    │
    ├─ progressEmitter.setStep('patterns')
    ├─ progressEmitter.setProgress(25)
    │
    ├─ generateWasteOptimizedPatterns()
    │   ├─ stats.patternsGenerated++
    │   ├─ stats.wasteCalculations++
    │   └─ progressEmitter.emit()
    │
    ├─ progressEmitter.setStep('dp')
    ├─ progressEmitter.setProgress(50)
    │
    ├─ dpSolveWithWasteOptimization()
    │   ├─ stats.dpStatesExplored++
    │   ├─ stats.dpComparisons++
    │   ├─ stats.memoHits++
    │   ├─ stats.memoPuts++
    │   └─ progressEmitter.emit()
    │
    ├─ progressEmitter.setStep('consolidation')
    ├─ progressEmitter.setProgress(75)
    │
    ├─ consolidateWaste()
    │   ├─ stats.consolidationChecks++
    │   └─ progressEmitter.emit()
    │
    ├─ progressEmitter.setStep('complete')
    ├─ progressEmitter.setProgress(100)
    │
    └─ return result
```

### 2. Event Emission (Backend → Frontend)
```
progressEmitter.updateStats(updates)
    │
    ├─ this.stats = { ...this.stats, ...updates }
    │
    ├─ this.listeners.forEach(listener => listener(this.stats))
    │
    └─ [Broadcast to all subscribed components]
```

### 3. React Component Update (Frontend)
```
useProcessingProgress()
    │
    ├─ useEffect(() => {
    │   progressEmitter.subscribe(newStats => {
    │       setStats(newStats)
    │       setIsProcessing(...)
    │   })
    │ })
    │
    └─ return { stats, isProcessing }
        │
        └─ ProcessingProgress component re-renders
            │
            └─ Display updated metrics
```

---

## Display Locations

### Location 1: Browser UI (React Component)
```
File: src/components/ProcessingProgress.tsx

Display:
├─ Progress bar (visual)
├─ Current step (text)
├─ 8 metric cards (numbers)
├─ Execution time (number)
└─ Status indicator (animated)

Updates: Real-time (via React state)
Frequency: Every calculation
Latency: < 100ms
```

### Location 2: Server Console (Node.js Logs)
```
File: src/algorithms/wasteOptimizedCuttingStock.ts

Display:
├─ Step progress (text)
├─ Metric counts (numbers)
├─ Execution time (number)
└─ Final statistics (summary)

Updates: Per step
Frequency: 4 times per solve
Latency: Immediate
```

### Location 3: Browser Console (JavaScript Console)
```
Available via:
- progressEmitter.getStats()
- console.log(stats)

Display:
├─ All metrics (JSON)
├─ Current step (string)
├─ Progress percentage (number)
└─ Execution time (number)

Updates: On demand
Frequency: Manual inspection
Latency: Immediate
```

---

## Real-Time Updates Example

### Timeline of Updates

```
T=0ms:    Algorithm starts
          progressEmitter.setStep('perfect')
          progressEmitter.setProgress(0)
          ✅ UI updates: Progress bar at 0%, step = "Perfect Combinations"

T=12ms:   Perfect combinations found
          progressEmitter.incrementPerfectCombinations(23)
          ✅ UI updates: Perfect Combinations card shows "23"

T=25ms:   Pattern generation starts
          progressEmitter.setStep('patterns')
          progressEmitter.setProgress(25)
          ✅ UI updates: Progress bar at 25%, step = "Generating Patterns"

T=37ms:   Patterns generated
          progressEmitter.incrementPatternsGenerated(15)
          ✅ UI updates: Patterns Generated card shows "15"

T=50ms:   DP solving starts
          progressEmitter.setStep('dp')
          progressEmitter.setProgress(50)
          ✅ UI updates: Progress bar at 50%, step = "Running DP Solver"

T=52ms:   DP states explored
          progressEmitter.incrementDPStates(7)
          ✅ UI updates: DP States card shows "7"

T=55ms:   DP comparisons
          progressEmitter.incrementDPComparisons(154)
          ✅ UI updates: DP Comparisons card shows "154"

T=60ms:   Consolidation starts
          progressEmitter.setStep('consolidation')
          progressEmitter.setProgress(75)
          ✅ UI updates: Progress bar at 75%, step = "Consolidating Waste"

T=64ms:   Complete
          progressEmitter.setStep('complete')
          progressEmitter.setProgress(100)
          ✅ UI updates: Progress bar at 100%, step = "Complete"
```

---

## Metric Display Breakdown

### Perfect Combinations Card
```
┌─────────────────────────────┐
│ Perfect Combinations        │
│ ─────────────────────────── │
│ 23                          │
│                             │
│ Shows: Number of segment    │
│ combinations checked        │
│                             │
│ Updates: During Step 1      │
│ Color: Blue                 │
└─────────────────────────────┘
```

### Patterns Generated Card
```
┌─────────────────────────────┐
│ Patterns Generated          │
│ ─────────────────────────── │
│ 15                          │
│                             │
│ Shows: Number of cutting    │
│ patterns created            │
│                             │
│ Updates: During Step 2      │
│ Color: Green                │
└─────────────────────────────┘
```

### DP Comparisons Card
```
┌─────────────────────────────┐
│ DP Comparisons              │
│ ─────────────────────────── │
│ 154                         │
│                             │
│ Shows: Number of pattern    │
│ comparisons made            │
│                             │
│ Updates: During Step 3      │
│ Color: Purple               │
└─────────────────────────────┘
```

---

## Integration Checklist

- [ ] Import `ProcessingProgress` component
- [ ] Import `useProcessingProgress` hook
- [ ] Add component to your page
- [ ] Call `progressEmitter.reset()` before processing
- [ ] Call `progressEmitter.setStep()` at each step
- [ ] Call `progressEmitter.setProgress()` to update progress
- [ ] Call incrementer methods during calculations
- [ ] Test with real data
- [ ] Monitor metrics during processing
- [ ] Optimize based on metrics

---

## Summary

**Calculations are displayed in 3 locations:**

1. **Browser UI** - Real-time metric cards with progress bar
2. **Server Console** - Step-by-step progress logs
3. **Browser Console** - On-demand stats inspection

All updates happen **in real-time** as the algorithm processes, giving you complete visibility into what's happening!
