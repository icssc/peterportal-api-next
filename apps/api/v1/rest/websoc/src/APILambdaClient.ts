import { InvokeCommand, LambdaClient, LambdaClientConfig } from "@aws-sdk/client-lambda";
import type { WebsocAPIResponse } from "@libs/websoc-api-next";
import { zeroUUID } from "ant-stack";
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import type { Department, TermData } from "peterportal-api-next-types";

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
  private client!: LambdaClient;

  private service?: (
    event: APIGatewayProxyEvent,
    context: Context,
  ) => Promise<APIGatewayProxyResult>;

  private constructor() {}

  static async new(configuration: LambdaClientConfig = {}) {
    const client = new APILambdaClient();
    client.client = new LambdaClient(configuration);
    if (process.env.NODE_ENV === "development") {
      const { handler } = await import("@services/websoc-proxy");
      client.service = handler;
    } else {
      client.service = undefined;
    }
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
        FunctionName: "peterportal-api-next-prod-websoc-proxy-service-function",
        Payload: new TextEncoder().encode(JSON.stringify({ body: JSON.stringify(body) })),
      }),
    );
    const payload = JSON.parse(Buffer.from(res.Payload ?? []).toString());
    return JSON.parse(payload.body);
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
