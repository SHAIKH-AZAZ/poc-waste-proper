# Web Workers Implementation

## Overview
This directory contains Web Worker implementations for running cutting stock algorithms in background threads, preventing UI blocking during heavy computations.

## Architecture

### Files
- `cuttingStock.worker.ts` - Worker script that runs algorithms in background thread
- `workerManager.ts` (in utils) - Manager class for worker lifecycle and communication

### How It Works

1. **Worker Initialization**
   - Two separate workers are created (one for Greedy, one for Dynamic)
   - Workers are initialized lazily on first use
   - Singleton pattern ensures only one WorkerManager instance

2. **Message Passing**
   - Main thread sends: `{ type, requests, dia }`
   - Worker processes and returns: `{ type, result, error? }`
   - Promise-based API for clean async/await usage

3. **Parallel Execution**
   - Both algorithms run simultaneously in separate workers
   - Results are collected using `Promise.all()`
   - Significantly faster for large datasets

## Usage

```typescript
import { getWorkerManager } from "@/utils/workerManager";

// Get singleton instance
const workerManager = getWorkerManager();

// Run both algorithms in parallel
const { greedy, dynamic } = await workerManager.runBoth(requests, dia);

// Or run individually
const greedyResult = await workerManager.runGreedy(requests, dia);
const dynamicResult = await workerManager.runDynamic(requests, dia);

// Clean up when done (optional, usually on component unmount)
workerManager.terminate();
```

## Benefits

1. **Non-blocking UI** - Heavy calculations don't freeze the interface
2. **Parallel Processing** - Both algorithms run simultaneously
3. **Better Performance** - Utilizes multiple CPU cores
4. **Responsive UX** - Users can interact with UI during calculations

## Browser Support

Web Workers are supported in all modern browsers:
- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge (all versions)

## Notes

- Workers run in separate thread with no DOM access
- Data is serialized/deserialized when passing between threads
- Workers are automatically terminated when page is closed
- For SSR compatibility, workers are only initialized client-side
