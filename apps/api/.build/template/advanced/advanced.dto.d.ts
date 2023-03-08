/**
 * DTOs (data transfer objects) are objects that carry data between processes
 * use them to define the Swagger API documentation and the return type of methods
 */
import { z } from "zod";
/**
 * DTO (data transfer object) representing the hello API;
 * ideally should be a class so it can be used as a type;
 * this is a string that can't extended, so you have to type the method manually
 */
export declare const helloDTO: import("@anatine/zod-nestjs").ZodDtoStatic<z.ZodString>;
declare const byeDTO_base: import("@anatine/zod-nestjs").ZodDtoStatic<
  z.ZodObject<
    {
      message: z.ZodString;
    },
    "strip",
    z.ZodTypeAny,
    {
      message: string;
    },
    {
      message: string;
    }
  >
>;
/**
 * DTO (data transfer object) representing the bye API;
 * this is a class that can be used to type the method return
 */
export declare class byeDTO extends byeDTO_base {}
export {};
//# sourceMappingURL=advanced.dto.d.ts.map
