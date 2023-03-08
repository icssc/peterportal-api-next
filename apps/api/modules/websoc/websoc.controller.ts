import { Controller, Get } from "@nestjs/common";
import { ApiCreatedResponse } from "@nestjs/swagger";

import { byeDTO, helloDTO } from "./websoc.dto";
import { AdvancedService } from "./websoc.service";

/**
 * all routes begin at /advanced
 */
@Controller("/advanced")
export class WebsocController {
  /**
   * describe all services/providers this controller needs (i.e. classes that can handle data)
   */
  constructor(private readonly advancedService: AdvancedService) {}

  /**
   * hello route
   */
  @Get("hello")
  @ApiCreatedResponse({
    type: helloDTO,
  })
  hello(): Promise<string> {
    return this.advancedService.hello();
  }

  /**
   * bye route
   */
  @Get("bye")
  @ApiCreatedResponse({
    type: byeDTO,
  })
  bye(): Promise<byeDTO> {
    return this.advancedService.bye();
  }
}
