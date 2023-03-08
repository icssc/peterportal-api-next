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
import { PrismaService } from "db";
import { AdvancedController } from "./advanced.controller";
import { AdvancedService } from "./advanced.service";
/**
 * make sure all controllers and services are imported here
 */
let AdvancedModule = class AdvancedModule {};
AdvancedModule = __decorate(
  [
    Module({
      controllers: [AdvancedController],
      providers: [AdvancedService, PrismaService],
    }),
  ],
  AdvancedModule
);
export { AdvancedModule };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWR2YW5jZWQubW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vdGVtcGxhdGUvYWR2YW5jZWQvYWR2YW5jZWQubW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBRW5DLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUVyRDs7R0FFRztBQUtJLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWM7Q0FBRyxDQUFBO0FBQWpCLGNBQWM7SUFKMUIsTUFBTSxDQUFDO1FBQ04sV0FBVyxFQUFFLENBQUMsa0JBQWtCLENBQUM7UUFDakMsU0FBUyxFQUFFLENBQUMsZUFBZSxFQUFFLGFBQWEsQ0FBQztLQUM1QyxDQUFDO0dBQ1csY0FBYyxDQUFHO1NBQWpCLGNBQWMifQ==
