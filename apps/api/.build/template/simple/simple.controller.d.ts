import { byeDTO } from "./simple.dto";
import { SimpleService } from "./simple.service";
/**
 * all routes begin at /simple
 */
export declare class SimpleController {
  private readonly simpleService;
  /**
   * describe all services/providers this controller needs (i.e. classes that can handle data)
   */
  constructor(simpleService: SimpleService);
  /**
   * hello route
   */
  hello(): string;
  /**
   * bye route
   */
  bye(): byeDTO;
}
//# sourceMappingURL=simple.controller.d.ts.map
