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
import { NestFactory } from "@nestjs/core";
import serverlessExpress from "@vendia/serverless-express";
//-----------------------------------------------------------------------------------
// START: module setup
//-----------------------------------------------------------------------------------
import { AdvancedModule } from "./template/advanced/advanced.module";
import { SimpleModule } from "./template/simple/simple.module";
let AppModule = class AppModule {};
AppModule = __decorate(
  [
    Module({
      imports: [SimpleModule, AdvancedModule],
    }),
  ],
  AppModule
);
//-----------------------------------------------------------------------------------
// END: module setup
//-----------------------------------------------------------------------------------
let server;
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}
export const handler = async (event, context, callback) => {
  server = server ?? (await bootstrap());
  return server(event, context, callback);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbGFtYmRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQzNDLE9BQU8saUJBQWlCLE1BQU0sNEJBQTRCLENBQUM7QUFFM0QscUZBQXFGO0FBQ3JGLHNCQUFzQjtBQUN0QixxRkFBcUY7QUFDckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUsvRCxJQUFNLFNBQVMsR0FBZixNQUFNLFNBQVM7Q0FBRyxDQUFBO0FBQVosU0FBUztJQUhkLE1BQU0sQ0FBQztRQUNOLE9BQU8sRUFBRSxDQUFDLFlBQVksRUFBRSxjQUFjLENBQUM7S0FDeEMsQ0FBQztHQUNJLFNBQVMsQ0FBRztBQUVsQixxRkFBcUY7QUFDckYsb0JBQW9CO0FBQ3BCLHFGQUFxRjtBQUVyRixJQUFJLE1BQWUsQ0FBQztBQUVwQixLQUFLLFVBQVUsU0FBUztJQUN0QixNQUFNLEdBQUcsR0FBRyxNQUFNLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDaEQsTUFBTSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7SUFFakIsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3RELE9BQU8saUJBQWlCLENBQUMsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztBQUNoRCxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFZLEtBQUssRUFBRSxLQUFVLEVBQUUsT0FBZ0IsRUFBRSxRQUFrQixFQUFFLEVBQUU7SUFDekYsTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQztJQUN2QyxPQUFPLE1BQU0sQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQyJ9
