import { Module } from "@nestjs/common";
import { PrismaService } from "db";

import { WebsocController } from "./websoc.controller";
import { AdvancedService } from "./websoc.service";

/**
 * make sure all controllers and services are imported here
 */
@Module({
  controllers: [WebsocController],
  providers: [AdvancedService, PrismaService],
})
export class WebsocModule {}
