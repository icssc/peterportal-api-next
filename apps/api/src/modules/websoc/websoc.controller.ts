import { ZodValidationPipe } from "@anatine/zod-nestjs";
import { Controller, Get, Query, UsePipes } from "@nestjs/common";
import { ApiCreatedResponse } from "@nestjs/swagger";

import { WebsocQueryDto } from "./websoc.dto";
import { WebsocService } from "./websoc.service";

/**
 * Controller routes begin at /websoc
 */
@Controller("/websoc")
@UsePipes(ZodValidationPipe)
export class WebsocController {
  constructor(private readonly websoc: WebsocService) {}

  /**
   * Query the websoc API.
   */
  @Get("")
  @ApiCreatedResponse({ type: WebsocQueryDto })
  async query(@Query() query: WebsocQueryDto) {
    const response = await this.websoc.query(query);
    return response;
  }
}
