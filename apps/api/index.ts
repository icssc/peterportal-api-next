import "dotenv/config";

import { patchNestjsSwagger } from "@anatine/zod-nestjs";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";

import { HelloModule } from "./modules/hello/hello.module";

@Module({
  imports: [HelloModule],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  SwaggerModule.setup("api/swagger", app, document);

  await app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Server ready at http://localhost:${port}`);
  });
}
export const viteNodeApp = bootstrap();
