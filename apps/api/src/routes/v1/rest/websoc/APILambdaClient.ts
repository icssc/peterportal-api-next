import type { Department, TermData } from "@anteater-api/types";
import type { LambdaClientConfig } from "@aws-sdk/client-lambda";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { zeroUUID } from "@libs/lambda";
import type { WebsocAPIResponse } from "@libs/uc-irvine-lib/websoc";
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

/**
 * A {@link `LambdaClient`} wrapper for the API to interface with the WebSoc proxy service.
 *
 * This class behaves slightly differently depending on the environment.
 * In the development environment, instead of talking to the proxy service in AWS, it takes the code
 * of the proxy service and executes it directly.
 *
 * Since the import process is asynchronous, instances of this class have to be created using
 * the static {@link `new`} method, rather than invoking the constructor. For the same reason,
 * the constructor is private, and doesn't actually do anything other than return an empty instance.
 */
export class APILambdaClient {
  private client: LambdaClient;

  private initialized = false;

  private service?: (
    event: APIGatewayProxyEvent,
    context: Context,
  ) => Promise<APIGatewayProxyResult>;

  private constructor(configuration: LambdaClientConfig = {}) {
    this.client = new LambdaClient(configuration);
  }

  static async new(configuration: LambdaClientConfig = {}) {
    const client = new APILambdaClient(configuration);

    await client.$connect();

    return client;
  }

  private async invoke(body: Record<string, unknown>) {
    if (this.service) {
      const payload = await this.service(
        { body: JSON.stringify(body) } as APIGatewayProxyEvent,
        { awsRequestId: zeroUUID } as Context,
      );
      return JSON.parse(payload.body);
    }
    const res = await this.client.send(
      new InvokeCommand({
        FunctionName: "anteater-api-services-prod-websoc-proxy-function",
        Payload: new TextEncoder().encode(JSON.stringify({ body: JSON.stringify(body) })),
      }),
    );
    const payload = JSON.parse(Buffer.from(res.Payload ?? []).toString());
    return JSON.parse(payload.body);
  }

  public async $connect() {
    if (this.initialized) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      const { handler } = await import("@services/websoc-proxy");
      this.service = handler;
    } else {
      this.service = undefined;
    }

    this.initialized = true;
  }

  async getDepts(body: Record<string, unknown>): Promise<Department[]> {
    const invocationResponse = await this.invoke(body);
    return invocationResponse.payload;
  }

  async getTerms(body: Record<string, unknown>): Promise<TermData[]> {
    const invocationResponse = await this.invoke(body);
    return invocationResponse.payload;
  }

  async getWebsoc(body: Record<string, unknown>): Promise<WebsocAPIResponse> {
    const invocationResponse = await this.invoke(body);
    return invocationResponse.payload;
  }
}
