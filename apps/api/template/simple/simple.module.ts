import { Module } from "@nestjs/common";

import { SimpleController } from "./simple.controller";
import { SimpleService } from "./simple.service";

/**
 * make sure all controllers and services are imported here
 */
@Module({
  controllers: [SimpleController],
  providers: [SimpleService],
})
export class SimpleModule {}
