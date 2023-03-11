import { Module } from "@nestjs/common";
import { PrismaService } from "db";

import { WebsocController } from "./websoc.controller";
import { WebsocService } from "./websoc.service";

/**
 * make sure all controllers and services are imported here
 */
@Module({
  controllers: [WebsocController],
  providers: [WebsocService, PrismaService],
})
export class WebsocModule {}
