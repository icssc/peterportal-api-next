import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import serverlessExpress from "@vendia/serverless-express";
import type { Callback, Context, Handler } from "aws-lambda";

//-----------------------------------------------------------------------------------
// START: module setup
//-----------------------------------------------------------------------------------
import { AdvancedModule } from "./template/advanced/advanced.module";
import { SimpleModule } from "./template/simple/simple.module";

@Module({
  imports: [SimpleModule, AdvancedModule],
})
class AppModule {}

//-----------------------------------------------------------------------------------
// END: module setup
//-----------------------------------------------------------------------------------

let server: Handler;

async function bootstrap(): Promise<Handler> {
  const app = await NestFactory.create(AppModule);
  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback
) => {
  server = server ?? (await bootstrap());
  return server(event, context, callback);
};
