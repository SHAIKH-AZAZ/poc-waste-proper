# Cutting Stock Algorithm Implementation Details

This document provides a technical deep-dive into the implementation of the cutting stock algorithms in `src/algorithms/`.

## 1. Adaptive Algorithm Selection (`adaptiveCuttingStock.ts`)

The system uses a heuristic scoring model to decide which algorithm to run. This avoids using expensive operations (like full DP) on datasets where a simple Greedy approach yields identical results, or where the dataset is too large for DP to finish in time.

### Complexity Score Calculation
The selection is driven by a `complexityScore` (0.0 to 1.0).

**Inputs:**
- $N$: Total segments (`sizeScore`)
- $U$: Unique segment lengths (`typeScore`)
- $\sigma^2$: Variance of lengths (`varianceScore`)
- $D_{max}$: Max demand for a single type (`demandScore`)

**Normalization:**
The raw inputs are normalized to a 0-1 scale:
```typescript
sizeScore     = min(totalSegments / 100, 1)
typeScore     = min(uniqueTypes / 20, 1)
varianceScore = min(variance / 10, 1)
demandScore   = min(maxDemand / 50, 1)
```

**Weighted Formula:**
$$ Score = (0.3 \cdot S_{size}) + (0.3 \cdot S_{type}) + (0.2 \cdot S_{var}) + (0.2 \cdot S_{demand}) $$

### Decision Logic
1.  **Branch & Bound**: If $N \le 20$ and $U \le 6$. (Small enough for exact solution).
2.  **True Dynamic**: If $N \le 50$, $U \le 10$, and $Score < 0.6$. (Medium complexity).
3.  **Column Generation**: If $N \le 200$ and $Score \ge 0.6$. (High complexity/density).
4.  **Greedy**: If $N > 200$. (Too large for exact methods).

---

## 2. True Dynamic Programming (`trueDynamicCuttingStock.ts`)

This implementation solves the **Bin Packing Problem** variant known as the **Cutting Stock Problem**. It decomposes the problem into two distinct stages.

### Stage 1: Pattern Generation (Knapsack Problem)
First, we generate all "interesting" cutting patterns. A pattern is a valid combination of lengths that fit into a standard bar (e.g., 12m).

**Problem:** Find a combination of items $\{l_1, l_2, ...\}$ such that $\sum l_i \le L_{stock}$.
**Algorithm:** Unbounded Knapsack Pattern Generation.
**DP State:** `dp[w]` = boolean (can we achieve exactly length `w`?).

The implementation actually maximizes "Value", where Value = Length.
```typescript
// dp[i][w] = max value using first i items with capacity w
if (item.length <= w) {
  dp[i][w] = max(dp[i-1][w], dp[i-1][w - item.length] + item.value)
}
```

### Stage 2: Pattern Selection (Set Cover Approximation)
Once we have a pool of valid patterns, we must select the minimum number of patterns to satisfy the demand.

**Algorithm:** Greedy Set Cover.
**Logic:**
1.  Calculate current "Efficiency" for all patterns.
    $$ Efficiency = \frac{\text{DemandCoveredByPattern}}{\text{WasteOfPattern}} $$
2.  Select the pattern with the highest efficiency.
3.  Subtract the cuts provided by this pattern from the total `RemainingDemand`.
4.  Repeat until `RemainingDemand` is 0.

---

## 3. Column Generation (Advanced Fallback)

If the pre-generated patterns are insufficient or the problem size is large, the generic Pattern Generation (Stage 1) creates too many variations (combinatorial explosion). We use **Column Generation**.

**Concept:** Instead of generating *all* patterns, we generate patterns *on the fly* that are likely to improve the current solution.

**Shadow Price (Dual Variables) Estimation:**
We assign a "price" (value) to each segment type based on scarcity.
-   Base Price = Length of segment.
-   Multiplier = If demand is unmet, increase price drastically.
    $$ Price = Length \cdot (1 + \log_{10}(\text{RemainingDemand} + 1)) $$

**Pricing Subproblem:**
We solve a new Knapsack problem using these dynamic *Prices* instead of just lengths.
-   This finds a pattern that is "most valuable" given the current unmet demand.
-   This new pattern is added to the pool, and we re-solve the Set Cover.
-   This converges significantly faster than standard DP for complex datasets.

---

## 4. Lap & Overlapping Logic (`MultiBarCalculator.ts`)

In construction, reinforced steel bars (>12m) cannot be transported or manufactured in one piece. They must be split into smaller segments and joined with "Lap Splices" (overlapping sections).

### Logic Breakdown
If a required cut length $L_{req} > 12m$:
1.  **Splitting**: The bar is split into $N$ segments.
2.  **Effective Length**: The visible, structural length of each segment.
3.  **Cutting Length**: The actual amount of steel needed, *including* the overlap.

**Formula:**
$$ \text{Cutting Length} = \text{Effective Length} + \text{Lap Length} $$

**Implementation Strategy:**
*   **Intermediate Segments**: These must connect to the *next* segment.
    *   $\text{Cutting Length} = \text{Effective Length} + \text{Lap Length}$.
    *   Usually, this completely fills a 12m bar (e.g., 11m effective + 1m lap = 12m).
*   **Last Segment**: This is the tail end.
    *   No lap is needed at the end.
    *   $\text{Cutting Length} = \text{Effective Length}$.

**Data Preprocessing**:
Before the cutting algorithms run, the `CuttingStockPreprocessor` converts one logical "20m bar" into multiple physical "Cutting Requests" (e.g., one 12m segment and one 9m segment), ensuring the algorithm treats them as standard pieces.

---

## 5. Simple Bar Cutting Bin Method (Greedy Algorithm) (`greedyCuttingStock.ts`)

For large datasets, we use a **First Fit Decreasing (FFD)** strategy. This is a heuristic that is computationally cheap ($O(N \log N)$) but often very effective.

### Algorithm Steps
1.  **Sort**: All requested segments are sorted by length in **Descending Order** (Longest to Shortest). This is crucial because smaller pieces are easier to fit into gaps left by larger pieces.
2.  **Waste Reuse Priority**:
    *   Before opening a new stock bar, the system checks the **Waste Inventory**.
    *   If a piece fits into an existing waste piece, it is used immediately.
3.  **Bin Packing**:
    *   Iterate through all currently open "Bins" (Stock bars).
    *   **Attempt to Fit**: Check if `Bin.remainingLength >= Segment.length`.
    *   **Constraint Check**: *Crucial Rule* - You cannot cut two segments of the *same* parent bar from the *same* stock bar (unless physically possible, but usually restricted to avoid complex logistics).
    *   **Place**: If it fits, place it and reduce the bin's remaining length.
    *   **New Bin**: If it fits nowhere, open a new 12m Stock Bar.

### Why "Decreasing"?
By placing large items first, we create "gaps" in the bins. The smaller items (processed later) fill these gaps, maximizing utilization. If we placed small items first, they would clutter new bins, leaving no room for the large items later.
