import { InvokeCommand, LambdaClient, LambdaClientConfig } from "@aws-sdk/client-lambda";
import type { WebsocAPIResponse } from "@libs/websoc-api-next";
import { zeroUUID } from "ant-stack";
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import type { Department, TermData } from "peterportal-api-next-types";

export class APILambdaClient {
  private client: LambdaClient;

  private service?: (
    event: APIGatewayProxyEvent,
    context: Context,
  ) => Promise<APIGatewayProxyResult>;

  constructor(configuration: LambdaClientConfig = {}) {
    this.client = new LambdaClient(configuration);
    if (process.env.NODE_ENV === "production") {
      this.service = undefined;
    } else {
      import("@services/websoc-proxy-service").then((x) => (this.service = x.handler));
    }
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
        FunctionName: "peterportal-api-next-prod-websoc-proxy-service",
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
