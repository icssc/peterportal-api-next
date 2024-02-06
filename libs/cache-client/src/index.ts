import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

export class APICacheClient {
  private readonly docClient;
  private readonly route;
  private readonly tableName;
  private readonly ttlMillis;

  constructor({
    route,
    tableName,
    ttlMillis,
  }: {
    route: string;
    tableName?: string;
    ttlMillis?: number;
  }) {
    this.docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    this.route = route;
    this.tableName = tableName ?? `peterportal-api-next-${process.env.STAGE}-cache`;
    this.ttlMillis = ttlMillis ?? 5 * 60 * 1000;
  }

  private getCacheKey(params: Record<string, string | undefined>): string {
    return `${this.route}?${Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")}`;
  }

  async get<T>(params: Record<string, string | undefined>): Promise<T | undefined> {
    return await this.docClient
      .send(
        new GetCommand({
          TableName: this.tableName,
          Key: { cacheKey: this.getCacheKey(params) },
        }),
      )
      .then((x) => x.Item?.payload);
  }

  async put<T>(params: Record<string, string | undefined>, payload: T): Promise<T> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          cacheKey: this.getCacheKey(params),
          payload,
          expireAt: Date.now() + this.ttlMillis,
        },
      }),
    );
    return payload;
  }
}
