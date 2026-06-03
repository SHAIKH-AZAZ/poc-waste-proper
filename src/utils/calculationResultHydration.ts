import { ObjectId } from "mongodb";

export interface CalculationResultMongoDetail {
  _id: ObjectId;
  patterns?: unknown[];
  detailedCuts?: unknown[];
  summary?: unknown | null;
}

export function collectValidObjectIds(
  ids: readonly (string | null | undefined)[]
): ObjectId[] {
  const objectIds: ObjectId[] = [];

  for (const id of ids) {
    if (!id) {
      continue;
    }

    try {
      objectIds.push(new ObjectId(id));
    } catch {
      continue;
    }
  }

  return objectIds;
}

export function buildCalculationResultDetailMap(
  docs: readonly CalculationResultMongoDetail[]
): Map<string, CalculationResultMongoDetail> {
  const detailMap = new Map<string, CalculationResultMongoDetail>();

  for (const doc of docs) {
    detailMap.set(doc._id.toString(), doc);
  }

  return detailMap;
}

export function hydrateCalculationResults<
  T extends {
    mongoResultId: string | null;
  },
>(
  results: readonly T[],
  detailMap: ReadonlyMap<string, CalculationResultMongoDetail>
) {
  return results.map((result) => {
    if (!result.mongoResultId) {
      return result;
    }

    const detail = detailMap.get(result.mongoResultId);
    if (!detail) {
      return result;
    }

    return {
      ...result,
      patterns: detail.patterns || [],
      detailedCuts: detail.detailedCuts || [],
      summary: detail.summary || null,
    };
  });
}
