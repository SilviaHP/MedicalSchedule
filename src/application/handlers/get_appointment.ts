import { APIGatewayEvent } from 'aws-lambda';
import { AppointmentRepository } from "../../domain/ports/appointment_repository";
import { AppointmentRepositoryImplement } from "../../infraestructure/repositories/appointment_repository_impl";
//import { dynamoDBClient } from '../../infrastructure/database/dynamodb_client';
//import { Logger } from '../../utils/logger';
//const logger = new Logger();

import { Messages } from "../utils/messages";
const {INSUREDID_REQUIRED 
      ,APPOINTMENT_NOT_FOUND
      ,APPOINTMENT_TABLE_ERROR} =Messages;

const appointmentRepository: AppointmentRepository =
  new AppointmentRepositoryImplement();


//Lista de citas por asegurado
export const handler = async (event: APIGatewayEvent) => {

    const insuredId = event.pathParameters?.insuredId || null;
    if (!insuredId) {
        return {
            statusCode: 400,
            body: JSON.stringify( { message: INSUREDID_REQUIRED ,
            }),
          };
    }
    try {
        const appointments = await appointmentRepository.getByInsureId(insuredId);
        if (!appointments) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: APPOINTMENT_NOT_FOUND }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(appointments),
        };

    } catch (error) {
        console.error("Error 500:", APPOINTMENT_TABLE_ERROR);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: APPOINTMENT_TABLE_ERROR }),
        };
    }
};