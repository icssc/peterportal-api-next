import { patchNestjsSwagger } from "@anatine/zod-nestjs";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";

import { AppModule } from "./app.module";

//-----------------------------------------------------------------------------------
// START server settings
//-----------------------------------------------------------------------------------
const port = 3000;
const swaggerUrl = "/api/swagger";

//-----------------------------------------------------------------------------------
// END server settings
//-----------------------------------------------------------------------------------

/**
 * start the NestJS/Express dev server locally
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * enable app to read cookies
   */
  app.use(cookieParser());

  /**
   * enable CORS requests
   */
  app.enableCors({ origin: true, credentials: true });

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
  await app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Server ready at http://localhost:${port}`);
  });
}

bootstrap();
