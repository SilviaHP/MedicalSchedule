import { 
    SQSClient, 
    DeleteMessageCommand,
    SendMessageCommand
} from '@aws-sdk/client-sqs';

// instancia para SQSClient
export class SqsClient {
    private static instance: SQSClient;

    private constructor() {}

    public static getInstance(): SQSClient {
        if (!SqsClient.instance) {
            SqsClient.instance = new SQSClient({ 
                region: process.env.DEMO_REGION || 'us-east-1'
            });
        }
        return SqsClient.instance;
    }
}

// procesa mensajes de SNS que llegan a través de SQS
export const processSnsMessageFromSqs = (sqsMessage: any): any => {
    try {
        console.log('Procesando mensaje SQS:', JSON.stringify(sqsMessage.body).substring(0, 200) + '...');
        
        // body puede venir como string o como objeto ya parseado
        const body = typeof sqsMessage.body === 'string' ? 
            JSON.parse(sqsMessage.body) : 
            sqsMessage.body;
        
        // verifico si Message existe en el body
        if (!body.Message) {
            throw new Error('El mensaje SNS no contiene campo Message');
        }
        

        let snsPayload;
        try {
            // primero intento parsear directamente
            snsPayload = JSON.parse(body.Message);
        } catch (parseError) {
            console.log('Error en primer intento de parse. Intentando eliminar caracteres escapes:', parseError);
            
            // si falla, reemplaza escapes dobles y luego parsear
            const cleanedMessage = body.Message
                .replace(/\\"/g, '"')      // Reemplaza \" por "
                .replace(/\\n/g, '')       // Elimina \n
                .replace(/\\\\/g, '\\');   // Reemplaza \\ por \
                
            // elimina caracteres de escape al inicio/fin
            const trimmedMessage = cleanedMessage.trim();
         

            snsPayload = JSON.parse(trimmedMessage);
        }
        
        console.log('Payload SNS parseado correctamente:', 
            JSON.stringify(snsPayload).substring(0, 100) + '...');
        
        return {
            data: snsPayload,
            messageId: sqsMessage.messageId,
            receiptHandle: sqsMessage.receiptHandle,
            attributes: body.MessageAttributes || {}
        };
    } catch (error) {
        console.error('Error procesando mensaje SNS desde SQS:', error);
        console.error('Body original:', sqsMessage.body ? 
            (typeof sqsMessage.body === 'string' ? 
                sqsMessage.body.substring(0, 500) : 
                JSON.stringify(sqsMessage.body).substring(0, 500)) : 
            'undefined');
        throw error;
    }
};

// elimina un mensaje de la cola SQS
export const deleteMessageFromQueue = async (queueUrl: string, receiptHandle: string): Promise<void> => {
    const client = SqsClient.getInstance();
    
    const params = {
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
    };
    
    try {
        const command = new DeleteMessageCommand(params);
        await client.send(command);
        console.log('Message deleted from queue');
    } catch (error) {
        console.error('Error deleting message from SQS:', error);
        throw error;
    }
};

// envia mensaje a SQS
export const sendMessageToQueue = async (queueUrl: string, messageBody: string): Promise<string> => {
    const client = SqsClient.getInstance();
    
    const params = {
        QueueUrl: queueUrl,
        MessageBody: messageBody
    };
    
    try {
        const command = new SendMessageCommand(params);
        const response = await client.send(command);
        console.log(`Message sent to queue: ${response.MessageId}`);
        return response.MessageId || '';
    } catch (error) {
        console.error('Error sending message to SQS:', error);
        throw error;
    }
};