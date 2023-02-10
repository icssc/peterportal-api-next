import { DynamoDB, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandOutput,
  PutCommand,
  PutCommandOutput,
  TranslateConfig,
} from "@aws-sdk/lib-dynamodb";

export class DDBDocClient {
  private client: DynamoDBDocumentClient;
  constructor(
    configuration: DynamoDBClientConfig = {
      /* eslint-disable turbo/no-undeclared-env-vars */
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
      /* eslint-enable */
    },
    translateConfig: TranslateConfig = {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: false,
        convertClassInstanceToMap: false,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    }
  ) {
    this.client = DynamoDBDocumentClient.from(
      new DynamoDB(configuration),
      translateConfig
    );
  }
  public get(
    tableName: string,
    key?: Record<string, never>
  ): Promise<GetCommandOutput> {
    return this.client.send(
      new GetCommand({
        TableName: tableName,
        Key: key,
      })
    );
  }
  public put(
    tableName: string,
    item: Record<string, never>
  ): Promise<PutCommandOutput> {
    return this.client.send(
      new PutCommand({ TableName: tableName, Item: item })
    );
  }
}
