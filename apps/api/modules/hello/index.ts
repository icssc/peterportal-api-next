import "dotenv/config";

import { patchNestjsSwagger } from "@anatine/zod-nestjs";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";

import { HelloModule } from "./hello.module";

async function bootstrap() {
  const app = await NestFactory.create(HelloModule);
  const port = 3000;

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
    .setTitle("UCI Machine Learning Repoistory REST API")
    .setDescription("REST API documentation with Swagger")
    .build();

  /**
   * Swagger document
   */
  const document = SwaggerModule.createDocument(app, config);

  /**
   * mount Swagger document
   */
  SwaggerModule.setup("api/swagger", app, document);

  await app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Server ready at http://localhost:${port}`);
  });
}
bootstrap();
