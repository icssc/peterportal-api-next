/**
 * DTOs (data transfer objects) are objects that carry data between processes
 * use them to define the Swagger API documentation and the return type of methods
 */

import { createZodDto } from "@anatine/zod-nestjs";
import { extendApi } from "@anatine/zod-openapi";
import { z } from "zod";

/**
 * schema for data returned by "hello" route
 */
const helloSchema = z.string().describe("A string to welcome you :)");

/**
 * hello schema extended with OpenAPI metadata
 */
const helloApi = extendApi(helloSchema, { title: "HELLO" });

/**
 * DTO (data transfer object) representing the hello API;
 * ideally should be a class so it can be used as a type;
 * this is a string that can't extended, so you have to type the method manually
 */
export const helloDTO = createZodDto(helloApi);

/**
 * schema for data returned by "bye" route
 */
const byeSchema = z
  .object({
    message: z.string().describe("A string to say goodbye to you :("),
  })
  .describe("An object with a message");

/**
 * bye schema extended with OpenAPI metadata
 */
const byeApi = extendApi(byeSchema, { title: "BYE BYE" });

/**
 * DTO (data transfer object) representing the bye API;
 * this is a class that can be used to type the method return
 */
export class byeDTO extends createZodDto(byeApi) {}
