import { 
  DynamoDBClient, 
  GetItemCommand, 
  UpdateItemCommand,
  ReturnValue     
} from "@aws-sdk/client-dynamodb";
  
// Patrón Singleton para el cliente DynamoDB
export class DynamoDBClientInstance {
  private static instance: DynamoDBClient;

  private constructor() {}

  public static getInstance(): DynamoDBClient {
    if (!DynamoDBClientInstance.instance) {
      DynamoDBClientInstance.instance = new DynamoDBClient({
        region: process.env.DEMO_REGION || 'us-east-1'
      });
    }
    return DynamoDBClientInstance.instance;
  }
}


// Obtiene una cita de DynamoDB por su ID
// @param appointmentId ID de la cita a buscar
// @returns Los datos de la cita (ya convertidos a objeto simple)
export const getAppointmentById = async (appointmentId: string): Promise<any> => {
  try {
    const client = DynamoDBClientInstance.getInstance();
    
    const params = {
      TableName: process.env.APPOINTMENTS_TABLE || 'appointments',
      Key: {
        "appointmentId": { S: appointmentId }
      }
    };

    const command = new GetItemCommand(params);
    const response = await client.send(command);
    
    // Retornar simplemente el objeto con los datos relevantes
    if (!response.Item) return null;
    
    // Extraer solo los campos que realmente necesitas
    return {
      appointmentId: response.Item.appointmentId?.S,
      insuredId: response.Item.insuredId?.S,
      status: response.Item.status?.S,
      dateSchedule: response.Item.dateSchedule?.S,
      createdAt: response.Item.createdAt?.S,
      updatedAt: response.Item.updatedAt?.S
    };
  } catch (error) {
    console.error('Error al obtener cita de DynamoDB:', error);
    throw error;
  }
};


// Actualiza el estado de una cita en DynamoDB
// @param appointmentId ID de la cita a actualizar
// @param status nuevo estado de la cita
// @returns datos actualizados de la cita
export const updateAppointmentStatus = async (appointmentId: string, status: string): Promise<any> => {
  try {
    const client = DynamoDBClientInstance.getInstance();
    
    const params = {
      TableName: process.env.APPOINTMENTS_TABLE || 'appointments',
      Key: {
        "appointmentId": { S: appointmentId }
      },
      UpdateExpression: 'set #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': { S: status },
        ':updatedAt': { S: new Date().toISOString() }
      },
      ReturnValues: ReturnValue.ALL_NEW
    };

    const command = new UpdateItemCommand(params);
    const response = await client.send(command);
    
    if (!response.Attributes) return null;
    
    // extrae solo los campos que realmente necesitas
    return {
      appointmentId: response.Attributes.appointmentId?.S,
      insuredId: response.Attributes.insuredId?.S,
      status: response.Attributes.status?.S,
      dateSchedule: response.Attributes.dateSchedule?.S,
      createdAt: response.Attributes.createdAt?.S,
      updatedAt: response.Attributes.updatedAt?.S
    };
  } catch (error) {
    console.error('Error al actualizar cita en DynamoDB:', error);
    throw error;
  }
};