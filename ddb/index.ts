import {
  BillingMode,
  CreateTableCommand,
  DescribeTableCommand,
  DescribeTableOutput,
  DynamoDB,
  DynamoDBClientConfig,
  KeyType,
  ScalarAttributeType,
  TableClass,
  TableStatus,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandOutput,
  PutCommand,
  PutCommandOutput,
  TranslateConfig,
} from "@aws-sdk/lib-dynamodb";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type Key = {
  name: string;
  type: ScalarAttributeType;
};

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
  public async createTable(
    tableName: string,
    partitionKey: Key,
    sortKey?: Key,
    billingMode = BillingMode.PAY_PER_REQUEST,
    tableClass = TableClass.STANDARD,
    blocking = true
  ): Promise<void> {
    const attrDefs = [
      {
        AttributeName: partitionKey.name,
        AttributeType: partitionKey.type,
      },
    ];
    const keySchema = [
      {
        AttributeName: partitionKey.name,
        KeyType: KeyType.HASH,
      },
    ];
    if (sortKey) {
      attrDefs.push({
        AttributeName: sortKey.name,
        AttributeType: sortKey.type,
      });
      keySchema.push({
        AttributeName: sortKey.name,
        KeyType: KeyType.RANGE,
      });
    }
    await this.client.send(
      new CreateTableCommand({
        AttributeDefinitions: attrDefs,
        KeySchema: keySchema,
        TableName: tableName,
        BillingMode: billingMode,
        TableClass: tableClass,
      })
    );
    if (blocking) {
      for (;;) {
        try {
          if (
            (await this.describeTable(tableName)).Table?.TableStatus ===
            TableStatus.ACTIVE
          )
            return;
          throw new Error();
        } catch {
          await sleep(3000);
        }
      }
    }
  }
  public async describeTable(tableName: string): Promise<DescribeTableOutput> {
    return this.client.send(
      new DescribeTableCommand({
        TableName: tableName,
      })
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
