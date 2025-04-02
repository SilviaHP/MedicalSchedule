import { 
  DynamoDBClient as AwsDynamoDBClient,
} from "@aws-sdk/client-dynamodb";

export class DynamoDBClient {
  private static instance: AwsDynamoDBClient;

  // Utilidades para convertir entre formatos
  //  public static marshall = marshall;
  //  public static unmarshall = unmarshall;

  private constructor() {}

  public static getInstance(): AwsDynamoDBClient {
    if (!DynamoDBClient.instance) {
      DynamoDBClient.instance = new AwsDynamoDBClient({});
    }
    return DynamoDBClient.instance;
  }
}
