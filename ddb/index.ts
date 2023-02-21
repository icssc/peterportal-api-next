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
  private readonly client: DynamoDB;
  private readonly documentClient: DynamoDBDocumentClient;
  constructor(
    configuration: DynamoDBClientConfig = {
      region: process.env.AWS_REGION,
    },
    translateConfig: TranslateConfig = {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    }
  ) {
    this.client = new DynamoDB(configuration);
    this.documentClient = DynamoDBDocumentClient.from(
      this.client,
      translateConfig
    );
  }
  public async get(
    tableName: string,
    key?: Record<string, unknown>
  ): Promise<GetCommandOutput> {
    return this.documentClient.send(
      new GetCommand({
        TableName: tableName,
        Key: key,
      })
    );
  }
  public async put(
    tableName: string,
    item: Record<string, unknown>
  ): Promise<PutCommandOutput> {
    return this.documentClient.send(
      new PutCommand({ TableName: tableName, Item: item })
    );
  }
}
