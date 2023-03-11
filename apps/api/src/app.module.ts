/**
 * root app module: import all other modules here
 */

import { Module } from "@nestjs/common";

import { WebsocModule } from "./modules/websoc/websoc.module";

@Module({
  imports: [WebsocModule],
})
export class AppModule {}
