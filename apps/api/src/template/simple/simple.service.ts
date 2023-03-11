/**
 * services/providers are can be used handle data needed by controllers
 * they can be used to call other services, the database, external APIs, etc.
 *
 * you might not always need a service, but this template demonstrates how to apply one
 */

import { Injectable } from "@nestjs/common";

import { byeDTO } from "./simple.dto";

/**
 * injectable decorator is required so NestJS can inject it during runtime
 */
@Injectable()
export class SimpleService {
  /**
   * hello service
   */
  hello(): string {
    return "Hello, World!";
  }

  /**
   * bye service
   */
  bye(): byeDTO {
    return {
      message: "Bye, World!",
    };
  }
}
