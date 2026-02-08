/**
 * Application-wide constants and configuration
 */

// Waste Management
export const WASTE_MIN_LENGTH_MM = 1000; // Minimum waste length to save (in mm) - 1 meter
export const WASTE_MIN_LENGTH_M = WASTE_MIN_LENGTH_MM / 1000; // In meters

// Standard Bar
export const STANDARD_BAR_LENGTH_MM = 12000; // Standard bar length (in mm) - 12 meters
export const STANDARD_BAR_LENGTH_M = STANDARD_BAR_LENGTH_MM / 1000; // In meters

// Algorithm Settings
export const DYNAMIC_MAX_ITERATIONS = 900000; // Max iterations for pattern selection loop (prevents infinite loops)
export const DYNAMIC_PATTERN_MAX_DEPTH = 10; // Max depth for pattern generation (max different cuts per pattern)

// Dataset Size Thresholds
export const LARGE_DATASET_THRESHOLD = 500;
export const VERY_LARGE_DATASET_THRESHOLD = 2000;
