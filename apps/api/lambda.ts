/**
 * https://javascript.plainenglish.io/serverless-nestjs-document-your-api-with-swagger-and-aws-api-gateway-64a53962e8a2
 * https://github.com/nestjs/swagger/issues/199#issue-417253224
 */

import { patchNestjsSwagger } from "@anatine/zod-nestjs";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
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
  const expressApp = app.getHttpAdapter().getInstance();

  /**
   * enable Zod schemas to generate Swagger documentation
   */
  patchNestjsSwagger();

  /**
   * configure Swagger
   */
  const config = new DocumentBuilder()
    .setTitle("PeterPortal API NexstJS")
    .setDescription("PeterPortal API documentation with Swagger")
    .build();

  /**
   * Swagger document
   */
  const document = SwaggerModule.createDocument(app, config);

  /**
   * mount Swagger document
   */
  SwaggerModule.setup("api", app, document);

  await app.init();

  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback
) => {
  if (event.path === "/api") {
    event.path = "/api/";
  }
  event.path = event.path.includes("swagger-ui")
    ? `/api${event.path}`
    : event.path;

  server = server ?? (await bootstrap());
  return server(event, context, callback);
};
