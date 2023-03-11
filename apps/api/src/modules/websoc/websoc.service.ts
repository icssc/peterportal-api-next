import { Injectable } from "@nestjs/common";
import { PrismaService } from "db";
import type { WebsocAPIResponse } from "peterportal-api-next-types";
import { callWebSocAPI } from "websoc-api-next";

import { WebsocQueryDto } from "./websoc.dto";
import {
  combineResponses,
  constructPrismaQuery,
  normalizeQuery,
  sortResponse,
} from "./websoc.lib";

/**
 * Type guard to assert that the value is defined.
 */
function notNull<T>(value: T): value is NonNullable<T> {
  return value != null;
}

/**
 * Type guard to assert that the settled promise was fulfilled.
 */
function fulfilled<T>(
  value: PromiseSettledResult<T>
): value is PromiseFulfilledResult<T> {
  return value.status === "fulfilled";
}

@Injectable()
export class WebsocService {
  constructor(private readonly prisma: PrismaService) {}

  async query(query: WebsocQueryDto) {
    if (!query.cache) {
      const websocSections = await this.prisma.websocSection.findMany({
        where: constructPrismaQuery(query),
        select: { data: true },
        distinct: ["year", "quarter", "sectionCode"],
      });

      if (websocSections.length) {
        const websocApiResponses = websocSections.map(
          (x) => x.data
        ) as WebsocAPIResponse[];
        return sortResponse(combineResponses(...websocApiResponses));
      }
    }

    const queries = normalizeQuery(query);
    const responses = await Promise.allSettled(
      queries
        .filter(notNull)
        .map((options) => callWebSocAPI({ ...query }, options))
    );
    const successes = responses.filter(fulfilled);
    const result = successes.reduce(
      (acc, curr) => combineResponses(acc, curr.value),
      { schools: [] } as WebsocAPIResponse
    );
    return sortResponse(result);
  }
}
