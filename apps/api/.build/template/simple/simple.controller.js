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
import { byeDTO, helloDTO } from "./simple.dto";
import { SimpleService } from "./simple.service";
/**
 * all routes begin at /simple
 */
let SimpleController = class SimpleController {
  /**
   * describe all services/providers this controller needs (i.e. classes that can handle data)
   */
  constructor(simpleService) {
    this.simpleService = simpleService;
  }
  /**
   * hello route
   */
  hello() {
    return this.simpleService.hello();
  }
  /**
   * bye route
   */
  bye() {
    return this.simpleService.bye();
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
    __metadata("design:returntype", String),
  ],
  SimpleController.prototype,
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
    __metadata("design:returntype", byeDTO),
  ],
  SimpleController.prototype,
  "bye",
  null
);
SimpleController = __decorate(
  [Controller("/simple"), __metadata("design:paramtypes", [SimpleService])],
  SimpleController
);
export { SimpleController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlLmNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90ZW1wbGF0ZS9zaW1wbGUvc2ltcGxlLmNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNqRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUVyRCxPQUFPLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUNoRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFakQ7O0dBRUc7QUFFSSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFnQjtJQUMzQjs7T0FFRztJQUNILFlBQTZCLGFBQTRCO1FBQTVCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO0lBQUcsQ0FBQztJQUU3RDs7T0FFRztJQUtILEtBQUs7UUFDSCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDcEMsQ0FBQztJQUVEOztPQUVHO0lBS0gsR0FBRztRQUNELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0NBQ0YsQ0FBQTtBQWxCQztJQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUM7SUFDWixrQkFBa0IsQ0FBQztRQUNsQixJQUFJLEVBQUUsUUFBUTtLQUNmLENBQUM7Ozs7NkNBR0Q7QUFLRDtJQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFDVixrQkFBa0IsQ0FBQztRQUNsQixJQUFJLEVBQUUsTUFBTTtLQUNiLENBQUM7OztvQ0FDSyxNQUFNOzJDQUVaO0FBMUJVLGdCQUFnQjtJQUQ1QixVQUFVLENBQUMsU0FBUyxDQUFDO3FDQUt3QixhQUFhO0dBSjlDLGdCQUFnQixDQTJCNUI7U0EzQlksZ0JBQWdCIn0=
