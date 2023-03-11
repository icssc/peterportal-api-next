import { ZodValidationPipe } from "@anatine/zod-nestjs";
import { Body, Controller, Get, UsePipes } from "@nestjs/common";
import { ApiCreatedResponse } from "@nestjs/swagger";

import { WebsocQueryDto } from "./websoc.dto";
import { WebsocService } from "./websoc.service";

/**
 * all routes begin at /websoc
 */
@Controller("/websoc")
@UsePipes(ZodValidationPipe)
export class WebsocController {
  constructor(private readonly websoc: WebsocService) {}

  /**
   * default route: query the websoc API
   */
  @Get("")
  @ApiCreatedResponse({ type: WebsocQueryDto })
  async query(@Body() query: WebsocQueryDto) {
    const response = await this.websoc.query(query);
    return response;
  }
}
