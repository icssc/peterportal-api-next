import { Controller, Get } from "@nestjs/common";
import { ApiCreatedResponse } from "@nestjs/swagger";

import { byeDTO, helloDTO } from "./simple.dto";
import { SimpleService } from "./simple.service";

/**
 * all routes begin at /simple
 */
@Controller("/simple")
export class SimpleController {
  /**
   * describe all services/providers this controller needs (i.e. classes that can handle data)
   */
  constructor(private readonly simpleService: SimpleService) {}

  /**
   * hello route
   */
  @Get("hello")
  @ApiCreatedResponse({
    type: helloDTO,
  })
  hello(): string {
    return this.simpleService.hello();
  }

  /**
   * bye route
   */
  @Get("bye")
  @ApiCreatedResponse({
    type: byeDTO,
  })
  bye(): byeDTO {
    return this.simpleService.bye();
  }
}
