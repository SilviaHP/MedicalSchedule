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
  
  const command = new PublishCommand(params);
  const response = await client.send(command);

   return response.MessageId || '';
};

export const publishAppointmentCreated = async (appointment: any): Promise<string> => {
  const topicArn = process.env.SNS_TOPIC_ARN!;
  
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

