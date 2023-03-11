/**
 * @see {@link https://docs.nestjs.com/faq/serverless#example-integration}
 */

import { patchNestjsSwagger } from "@anatine/zod-nestjs";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import serverlessExpress from "@vendia/serverless-express";
import type { Handler } from "aws-lambda";

import { AppModule } from "./app.module";

//-----------------------------------------------------------------------------------
// START server settings
//-----------------------------------------------------------------------------------
const swaggerUrl = "/api";

//-----------------------------------------------------------------------------------
// END server settings
//-----------------------------------------------------------------------------------

/**
 * initialized server
 */
let server: Handler;

/**
 * initialize the server if it hasn't been initialized yet, i.e. cold-start
 */
async function bootstrap() {
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
   * create Swagger document
   */
  const document = SwaggerModule.createDocument(app, config);

  /**
   * mount Swagger document
   */
  SwaggerModule.setup(swaggerUrl, app, document);

  await app.init();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (event, context, callback) => {
  /**
   * @see {@link `https://github.com/nestjs/swagger/issues/199#issue-417253224}
   */
  if (event.path === swaggerUrl) {
    event.path = `${swaggerUrl}/`;
  }
  server = server ?? (await bootstrap());
  return server(event, context, callback);
};
