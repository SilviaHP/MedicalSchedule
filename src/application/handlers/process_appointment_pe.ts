import { SQSEvent } from 'aws-lambda';
import * as mysql from 'mysql2/promise';
import { processSnsMessageFromSqs } from '../../infraestructure/messaging/sqs_client';
import { sendAppointmentConfirmation } from '../../infraestructure/messaging/eventbridge_client';


// config. de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'appointments',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    connectTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '60000')
  };

// inicializa el pool de conexiones a la bd
let pool: mysql.Pool | null = null;
const initializePool = async (): Promise<mysql.Pool> => {
    if (!pool) {

      pool = mysql.createPool({
        ...dbConfig,
        waitForConnections: true,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '5'),
        queueLimit: 0
      });
      
      try {
        const connection = await pool.getConnection();
        connection.release();
      } catch (error) {
        console.error('Error estableciendo conexión a MySQL:', error);
        pool = null;
        throw error;
      }
    }
    return pool;
  };


export const handler = async (event: SQSEvent): Promise<void> => {
      
    // inicializa el pool de conexiones a la bd
    const dbPool = await initializePool();

    for (const record of event.Records) {
        try {
            // procesa el mensaje de SNS que viene en el mensaje SQS
            const message = processSnsMessageFromSqs(record);
            
            // extrae los datos de la cita
            const appointmentData = message.data.data;
            
            // implementa la lógica específica para PE
            await processAppointmentPE(appointmentData, dbPool);
            
            // si el procesamiento fue exitoso, eliminamos el mensaje de la cola
            // serverless framework lo hará si no hay excepciones
            
        } catch (error) {
            console.error('Error procesando mensaje para PE:', error);
            // si lanza el error, el mensaje volverá a la cola para reintentarse
            throw error;
        }
    }
};


async function processAppointmentPE(appointment: any, pool: mysql.Pool): Promise<void> {
  try {
      
      // verificar que los datos necesarios existen
      if (!appointment.appointmentId || !appointment.insuredId) {
          throw new Error('Faltan datos obligatorios para la cita');
      }
      
      // formatear fecha si es necesario
      let dateSchedule;
      try {
          dateSchedule = new Date(appointment.dateSchedule);
          // verifica si la fecha es válida
          if (isNaN(dateSchedule.getTime())) {
              console.warn(`Fecha inválida: ${appointment.dateSchedule}, usando fecha actual`);
              dateSchedule = new Date();
          }
      } catch (e) {
          console.warn(`Error parseando fecha: ${appointment.dateSchedule}, usando fecha actual`);
          dateSchedule = new Date();
      }
      
      // inserta en la base de datos
      const [result] = await pool.query(
          `INSERT INTO appointment_pe 
           (appointment_id, insured_id, schedule_id, center_id, specialty_id, 
            medic_id, date_schedule, country_iso, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           updated_at = CURRENT_TIMESTAMP`,
          [
              appointment.appointmentId,
              appointment.insuredId,
              appointment.scheduleId || null,
              appointment.centerId || null,
              appointment.specialtyId || null,
              appointment.medicId || null,
              dateSchedule,
              appointment.countryISO || 'PE',
              'CREATED'
          ]
      );
      
      console.log(`Cita guardada en MySQL:`, result);

      // envia confirmación de cita a EventBridge
      //await sendAppointmentConfirmation(appointment, 'PE');
      sendAppointmentConfirmation(appointment, 'PE')
      .then(() => console.log(`Confirmación enviada en segundo plano para ${appointment.appointmentId}`))
      .catch(err => console.error(`Error enviando confirmación para ${appointment.appointmentId}:`, err));
    
  } catch (error) {
      console.error('Error en el procesamiento para PE :', error);
      throw error;
  }
}
