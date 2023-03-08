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
import { Module } from "@nestjs/common";
import { SimpleController } from "./simple.controller";
import { SimpleService } from "./simple.service";
/**
 * make sure all controllers and services are imported here
 */
let SimpleModule = class SimpleModule {};
SimpleModule = __decorate(
  [
    Module({
      controllers: [SimpleController],
      providers: [SimpleService],
    }),
  ],
  SimpleModule
);
export { SimpleModule };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlLm1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RlbXBsYXRlL3NpbXBsZS9zaW1wbGUubW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUV4QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFakQ7O0dBRUc7QUFLSSxJQUFNLFlBQVksR0FBbEIsTUFBTSxZQUFZO0NBQUcsQ0FBQTtBQUFmLFlBQVk7SUFKeEIsTUFBTSxDQUFDO1FBQ04sV0FBVyxFQUFFLENBQUMsZ0JBQWdCLENBQUM7UUFDL0IsU0FBUyxFQUFFLENBQUMsYUFBYSxDQUFDO0tBQzNCLENBQUM7R0FDVyxZQUFZLENBQUc7U0FBZixZQUFZIn0=
