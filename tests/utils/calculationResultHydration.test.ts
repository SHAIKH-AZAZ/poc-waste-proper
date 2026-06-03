import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";

import {
  buildCalculationResultDetailMap,
  collectValidObjectIds,
  hydrateCalculationResults,
} from "@/utils/calculationResultHydration";

describe("calculationResultHydration", () => {
  it("ignores missing and invalid mongo ids", () => {
    const ids = collectValidObjectIds([
      new ObjectId().toString(),
      null,
      undefined,
      "not-an-object-id",
    ]);

    expect(ids).toHaveLength(1);
  });

  it("hydrates only results with matching mongo documents", () => {
    const matchingId = new ObjectId();
    const missingId = new ObjectId();

    const detailMap = buildCalculationResultDetailMap([
      {
        _id: matchingId,
        patterns: [{ id: "pattern-1" }],
        detailedCuts: [{ id: "cut-1" }],
        summary: { totalBarsUsed: 3 },
      },
    ]);

    const results = [
      {
        id: 1,
        dia: 16,
        mongoResultId: matchingId.toString(),
      },
      {
        id: 2,
        dia: 20,
        mongoResultId: missingId.toString(),
      },
      {
        id: 3,
        dia: 25,
        mongoResultId: null,
      },
    ];

    const hydrated = hydrateCalculationResults(results, detailMap);

    expect(hydrated[0]).toMatchObject({
      id: 1,
      patterns: [{ id: "pattern-1" }],
      detailedCuts: [{ id: "cut-1" }],
      summary: { totalBarsUsed: 3 },
    });
    expect(hydrated[1]).toEqual(results[1]);
    expect(hydrated[2]).toEqual(results[2]);
  });
});
