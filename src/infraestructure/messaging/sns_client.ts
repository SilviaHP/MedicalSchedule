import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

// crea una instancia de SNSClient
export class SnsClient {
  private static instance: SNSClient;

  private constructor() {}

  public static getInstance(): SNSClient {
    if (!SnsClient.instance) {
      SnsClient.instance = new SNSClient({ 
        region: process.env.DEMO_REGION || 'us-east-1'
      });
    }
    return SnsClient.instance;
  }
}


export const publishMessage = async (topicArn: string, message: string, messageAttributes?: Record<string, any>): Promise<string> => {
  const client = SnsClient.getInstance();
  
  const params = {
    Message: message,
    TopicArn: topicArn,
    MessageAttributes: messageAttributes
  };
    try {
        const command = new PublishCommand(params);
        const response = await client.send(command);

        return response.MessageId || '';
    } catch (error) {
        console.error('Error publishing message from SNS:', error);
        throw error;
    }
};


// funcion invocada en create_appointment.ts para enviar el mensaje a SNS 
export const publishAppointmentCreated = async (appointment: any): Promise<string> => {
  const topicArn = process.env.SNS_TOPIC_ARN!;
  
  // Agregar logs detallados
   const messagePayload = {
    event: 'APPOINTMENT_CREATED',
    timestamp: new Date().toISOString(),
    data: appointment
  };

  const messageAttributes = {
    eventType: { 
      DataType: 'String', 
      StringValue: 'APPOINTMENT_CREATED' 
    },
    country: {
      DataType: 'String',
      StringValue: appointment.countryISO || 'UNKNOWN'
    }
  };
  
  return await publishMessage(topicArn, JSON.stringify(messagePayload), messageAttributes);
};
