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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWR2YW5jZWQuZHRvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vdGVtcGxhdGUvYWR2YW5jZWQvYWR2YW5jZWQuZHRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRztBQUVILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDakQsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEtBQUssQ0FBQztBQUV4Qjs7R0FFRztBQUNILE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUV0RTs7R0FFRztBQUNILE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUU1RDs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUUvQzs7R0FFRztBQUNILE1BQU0sU0FBUyxHQUFHLENBQUM7S0FDaEIsTUFBTSxDQUFDO0lBQ04sT0FBTyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsbUNBQW1DLENBQUM7Q0FDbEUsQ0FBQztLQUNELFFBQVEsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBRXhDOztHQUVHO0FBQ0gsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO0FBRTFEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxNQUFPLFNBQVEsWUFBWSxDQUFDLE1BQU0sQ0FBQztDQUFHIn0=
