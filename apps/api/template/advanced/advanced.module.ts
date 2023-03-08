import { Module } from "@nestjs/common";
import { PrismaService } from "db";

import { AdvancedController } from "./advanced.controller";
import { AdvancedService } from "./advanced.service";

/**
 * make sure all controllers and services are imported here
 */
@Module({
  controllers: [AdvancedController],
  providers: [AdvancedService, PrismaService],
})
export class AdvancedModule {}
