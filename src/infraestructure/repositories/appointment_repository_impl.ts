import {
  DynamoDBClient ,
  PutItemCommand,
  QueryCommand
} from "@aws-sdk/client-dynamodb";
import { HttpException } from "../../application/utils/httpException";
import { Appointment } from "../../domain/entities/appointment";
import { AppointmentRepository } from "../../domain/ports/appointment_repository";
import { Messages } from "../../application/utils/messages";


const {APPOINTMENT_TABLE_ERROR} =Messages;
export class AppointmentRepositoryImplement implements AppointmentRepository {

  private regionAws: string = process.env.DEMO_REGION || 'us-east-1';

  async save( appointment: Appointment): Promise<any> {
    const client = new DynamoDBClient({ region: this.regionAws });
 
    const params = {
      TableName: process.env.APPOINTMENTS_TABLE!,
      Item: { 
        appointmentId: { S:  appointment.appointmentId},
        insuredId: { S: appointment.insuredId },
        scheduleId:  { S: appointment.scheduleId },
        centerId:  { S: appointment.centerId },
        specialtyId:  { S: appointment.specialtyId },
        medicId: { S: appointment.medicId },
        dateSchedule:  { S: appointment.dateSchedule },
        countryISO:  { S: appointment.countryISO },
        status:  { S: appointment.status },
        dateCreated: { S: appointment.dateCreated },
      }
    };

    try {
      const command = new PutItemCommand(params);
      await client.send(command);
      return appointment;

    } catch (error) {
      throw new HttpException( APPOINTMENT_TABLE_ERROR, 500);
    }
  }

  async getByInsureId(insuredId: string): Promise<any> {
    const client = new DynamoDBClient({ region: this.regionAws });
    const params = {
      TableName: process.env.APPOINTMENTS_TABLE!,
      IndexName: 'InsuredIdIndex', 
      KeyConditionExpression: "insuredId = :insuredId",
      ExpressionAttributeValues: {
        ":insuredId": { S: insuredId }
      }
    };

    try {
      const command = new QueryCommand(params);
      const response =  await client.send(command);
      
      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      // mapear todos los items a obj. Appointment
      const appointments = response.Items.map(item => ({
        insuredId: item.insuredId.S!,
        scheduleId: item.scheduleId.S!,
        centerId: item.centerId.S!,
        specialtyId: item.specialtyId.S!,
        medicId: item.medicId.S!,
        dateSchedule: item.dateSchedule.S!,
        countryISO: item.countryISO.S!,
        status: item.status.S!,
        dateCreated: item.dateCreated.S!,
      }));

      return appointments;

    } catch (error) {
      throw new HttpException(APPOINTMENT_TABLE_ERROR, 500);
    }
  }
}
