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
import { Injectable } from "@nestjs/common";
/**
 * injectable decorator is required so NestJS can inject it during runtime
 */
let SimpleService = class SimpleService {
  /**
   * hello service
   */
  hello() {
    return "Hello, World!";
  }
  /**
   * bye service
   */
  bye() {
    return {
      message: "Bye, World!",
    };
  }
};
SimpleService = __decorate([Injectable()], SimpleService);
export { SimpleService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlLnNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90ZW1wbGF0ZS9zaW1wbGUvc2ltcGxlLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0dBS0c7Ozs7Ozs7QUFFSCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFJNUM7O0dBRUc7QUFFSSxJQUFNLGFBQWEsR0FBbkIsTUFBTSxhQUFhO0lBQ3hCOztPQUVHO0lBQ0gsS0FBSztRQUNILE9BQU8sZUFBZSxDQUFDO0lBQ3pCLENBQUM7SUFFRDs7T0FFRztJQUNILEdBQUc7UUFDRCxPQUFPO1lBQ0wsT0FBTyxFQUFFLGFBQWE7U0FDdkIsQ0FBQztJQUNKLENBQUM7Q0FDRixDQUFBO0FBaEJZLGFBQWE7SUFEekIsVUFBVSxFQUFFO0dBQ0EsYUFBYSxDQWdCekI7U0FoQlksYUFBYSJ9
