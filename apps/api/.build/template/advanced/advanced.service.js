/**
 * services/providers are can be used handle data needed by controllers
 * they can be used to call other services, the database, external APIs, etc.
 *
 * you might not always need a service, but this template demonstrates how to apply one
 */
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
import { Injectable } from "@nestjs/common";
import { PrismaService } from "db";
/**
 * injectable decorator is required so NestJS can inject it during runtime
 */
let AdvancedService = class AdvancedService {
  /**
   * the prisma service will be injected
   */
  constructor(prisma) {
    this.prisma = prisma;
  }
  /**
   * hello service
   */
  async hello() {
    const instructor = await this.prisma.instructors.findFirst();
    return instructor?.shortened_name || "No instructor found";
  }
  /**
   * bye service
   */
  async bye() {
    const department = await this.prisma.departments.findFirst();
    return {
      message: department?.department_name || "No department found",
    };
  }
};
AdvancedService = __decorate(
  [Injectable(), __metadata("design:paramtypes", [PrismaService])],
  AdvancedService
);
export { AdvancedService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWR2YW5jZWQuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RlbXBsYXRlL2FkdmFuY2VkL2FkdmFuY2VkLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0dBS0c7Ozs7Ozs7Ozs7QUFFSCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDNUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLElBQUksQ0FBQztBQUluQzs7R0FFRztBQUVJLElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWU7SUFDMUI7O09BRUc7SUFDSCxZQUE2QixNQUFxQjtRQUFyQixXQUFNLEdBQU4sTUFBTSxDQUFlO0lBQUcsQ0FBQztJQUV0RDs7T0FFRztJQUNILEtBQUssQ0FBQyxLQUFLO1FBQ1QsTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUM3RCxPQUFPLFVBQVUsRUFBRSxjQUFjLElBQUkscUJBQXFCLENBQUM7SUFDN0QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLEdBQUc7UUFDUCxNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzdELE9BQU87WUFDTCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsSUFBSSxxQkFBcUI7U0FDOUQsQ0FBQztJQUNKLENBQUM7Q0FDRixDQUFBO0FBdkJZLGVBQWU7SUFEM0IsVUFBVSxFQUFFO3FDQUswQixhQUFhO0dBSnZDLGVBQWUsQ0F1QjNCO1NBdkJZLGVBQWUifQ==
