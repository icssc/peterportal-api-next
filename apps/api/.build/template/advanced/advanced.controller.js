var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
          ? (desc = Object.getOwnPropertyDescriptor(target, key))
          : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
      return Reflect.metadata(k, v);
  };
import { Controller, Get } from "@nestjs/common";
import { ApiCreatedResponse } from "@nestjs/swagger";
import { byeDTO, helloDTO } from "./advanced.dto";
import { AdvancedService } from "./advanced.service";
/**
 * all routes begin at /advanced
 */
let AdvancedController = class AdvancedController {
  /**
   * describe all services/providers this controller needs (i.e. classes that can handle data)
   */
  constructor(advancedService) {
    this.advancedService = advancedService;
  }
  /**
   * hello route
   */
  hello() {
    return this.advancedService.hello();
  }
  /**
   * bye route
   */
  bye() {
    return this.advancedService.bye();
  }
};
__decorate(
  [
    Get("hello"),
    ApiCreatedResponse({
      type: helloDTO,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise),
  ],
  AdvancedController.prototype,
  "hello",
  null
);
__decorate(
  [
    Get("bye"),
    ApiCreatedResponse({
      type: byeDTO,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise),
  ],
  AdvancedController.prototype,
  "bye",
  null
);
AdvancedController = __decorate(
  [Controller("/advanced"), __metadata("design:paramtypes", [AdvancedService])],
  AdvancedController
);
export { AdvancedController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWR2YW5jZWQuY29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RlbXBsYXRlL2FkdmFuY2VkL2FkdmFuY2VkLmNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNqRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUVyRCxPQUFPLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ2xELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUVyRDs7R0FFRztBQUVJLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQWtCO0lBQzdCOztPQUVHO0lBQ0gsWUFBNkIsZUFBZ0M7UUFBaEMsb0JBQWUsR0FBZixlQUFlLENBQWlCO0lBQUcsQ0FBQztJQUVqRTs7T0FFRztJQUtILEtBQUs7UUFDSCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDdEMsQ0FBQztJQUVEOztPQUVHO0lBS0gsR0FBRztRQUNELE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0NBQ0YsQ0FBQTtBQWxCQztJQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUM7SUFDWixrQkFBa0IsQ0FBQztRQUNsQixJQUFJLEVBQUUsUUFBUTtLQUNmLENBQUM7Ozs7K0NBR0Q7QUFLRDtJQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFDVixrQkFBa0IsQ0FBQztRQUNsQixJQUFJLEVBQUUsTUFBTTtLQUNiLENBQUM7Ozs7NkNBR0Q7QUExQlUsa0JBQWtCO0lBRDlCLFVBQVUsQ0FBQyxXQUFXLENBQUM7cUNBS3dCLGVBQWU7R0FKbEQsa0JBQWtCLENBMkI5QjtTQTNCWSxrQkFBa0IifQ==
