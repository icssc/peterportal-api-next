import { DynamoDB, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandOutput,
  PutCommand,
  PutCommandOutput,
  QueryCommand,
  QueryCommandOutput,
  TranslateConfig,
} from "@aws-sdk/lib-dynamodb";

export type Key = {
  name: string;
  value: string | number | boolean;
};

export type SortKey = Key & { cmp: "=" | "<" | "<=" | ">" | ">=" };

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
  public async query(
    tableName: string,
    partitionKey: Key,
    sortKey?: SortKey
  ): Promise<QueryCommandOutput> {
    return this.documentClient.send(
      new QueryCommand({
        TableName: tableName,
        ExpressionAttributeValues: {
          ":pkv": partitionKey.value,
          ":skv": sortKey?.value,
        },
        KeyConditionExpression: `${partitionKey.name} = :pkv${
          sortKey ? ` AND ${sortKey.name} ${sortKey.cmp} :skv` : ""
        }`,
      })
    );
  }
}
