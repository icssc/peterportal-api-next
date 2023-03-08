import { byeDTO } from "./advanced.dto";
import { AdvancedService } from "./advanced.service";
/**
 * all routes begin at /advanced
 */
export declare class AdvancedController {
  private readonly advancedService;
  /**
   * describe all services/providers this controller needs (i.e. classes that can handle data)
   */
  constructor(advancedService: AdvancedService);
  /**
   * hello route
   */
  hello(): Promise<string>;
  /**
   * bye route
   */
  bye(): Promise<byeDTO>;
}
//# sourceMappingURL=advanced.controller.d.ts.map
