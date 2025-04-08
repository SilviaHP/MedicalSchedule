import { SQSEvent } from 'aws-lambda';
import { updateAppointmentStatus } from '../../infraestructure/repositories/dynamodb_repository';


// Eetrae datos de cita del mensaje, manejando diferentes formatos
// @param record Registro del mensaje SQS
// @returns Datos normalizados de la cita
 
const extractAppointmentData = (record: any): any => {
  try {
    // Intentar parsear el cuerpo como JSON
    const body = typeof record.body === 'string' ? JSON.parse(record.body) : record.body;
    
    // Determinar formato basado en propiedades
    if (body.detail) {
      // Formato directo de EventBridge
      return body.detail;
    } else if (body.Message) {
      // Formato cuando EventBridge va a través de SNS
      try {
        return JSON.parse(body.Message);
      } catch (e) {
        // Si no es JSON válido
        return { 
          appointmentId: body.MessageAttributes?.appointmentId?.Value,
          message: body.Message
        };
      }
    } else {
      // Asumir que el cuerpo ya contiene la información
      return body;
    }
  } catch (error) {
    console.error('Error extrayendo datos de cita del mensaje:', error);
    throw error;
  }
};


// recibe mensajes de EventBridge y actualiza el estado en DynamoDB
export const handler = async (event: SQSEvent): Promise<void> => {

  for (const record of event.Records) {
    try {
      // extrae datos de la cita (maneja diferentes formatos)
      const appointmentData = extractAppointmentData(record);
      
      // valida que el mensaje contiene appointmentId
      if (!appointmentData.appointmentId) {
        console.error('Mensaje de confirmación no contiene appointmentId:', appointmentData);
        continue; // Saltar este mensaje
      }

      // actualiza la cita en DynamoDB
      await updateAppointmentStatus(
        appointmentData.appointmentId, 
        'COMPLETED'
      );
      
      
    } catch (error) {
      console.error('Error procesando mensaje de confirmación:', error);
    }
  }
  

};