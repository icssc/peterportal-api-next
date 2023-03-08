/**
 * services/providers are can be used handle data needed by controllers
 * they can be used to call other services, the database, external APIs, etc.
 *
 * you might not always need a service, but this template demonstrates how to apply one
 */

import { Injectable } from "@nestjs/common";
import { PrismaService } from "db";

import { byeDTO } from "./advanced.dto";

/**
 * injectable decorator is required so NestJS can inject it during runtime
 */
@Injectable()
export class AdvancedService {
  /**
   * the prisma service will be injected into this service
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * hello service
   */
  async hello(): Promise<string> {
    const instructor = await this.prisma.instructors.findFirst();
    return instructor?.shortened_name || "No instructor found";
  }

  /**
   * bye service
   */
  async bye(): Promise<byeDTO> {
    const department = await this.prisma.departments.findFirst();
    return {
      message: department?.department_name || "No department found",
    };
  }
}
