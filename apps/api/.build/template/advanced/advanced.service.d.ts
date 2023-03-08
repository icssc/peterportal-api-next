/**
 * services/providers are can be used handle data needed by controllers
 * they can be used to call other services, the database, external APIs, etc.
 *
 * you might not always need a service, but this template demonstrates how to apply one
 */
import { PrismaService } from "db";
import { byeDTO } from "./advanced.dto";
/**
 * injectable decorator is required so NestJS can inject it during runtime
 */
export declare class AdvancedService {
  private readonly prisma;
  /**
   * the prisma service will be injected
   */
  constructor(prisma: PrismaService);
  /**
   * hello service
   */
  hello(): Promise<string>;
  /**
   * bye service
   */
  bye(): Promise<byeDTO>;
}
//# sourceMappingURL=advanced.service.d.ts.map
