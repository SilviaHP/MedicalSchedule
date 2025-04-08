import { APIGatewayEvent } from "aws-lambda";
import { Appointment } from "../../domain/entities/appointment";
import { AppointmentRepository } from "../../domain/ports/appointment_repository";
import { AppointmentRepositoryImplement } from "../../infraestructure/repositories/appointment_repository_impl";
import { publishAppointmentCreated } from "../../infraestructure/messaging/sns_client";
import { Messages } from "../../application/utils/messages";
const {
  APPOINTMENT_REGISTRATION_ERROR,
  APPOINTMENT_REGISTERED_SUCCESS,
  APPOINTMENT_REQUIRED,
} = Messages;

const appointmentRepository: AppointmentRepository =
  new AppointmentRepositoryImplement();

export const handler = async (event: APIGatewayEvent) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: APPOINTMENT_REQUIRED }),
      };
    }

    const appointmentData = JSON.parse(event.body || "{}");
    const {
      insuredId,
      scheduleId,
      centerId,
      specialtyId,
      medicId,
      dateSchedule,
      countryISO,
    } = appointmentData;

    const appointment = new Appointment(
      insuredId,
      scheduleId,
      centerId,
      specialtyId,
      medicId,
      dateSchedule,
      countryISO
    );

    //const validationErrors = validateAppointment(appointment);
    const validationErrors: string[] = [];
    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: validationErrors }),
      };
    }

    // registrar en dynamodb
    const savedAppointment = await appointmentRepository.save(appointment);

    // publicar en SNS
    await publishAppointmentCreated(savedAppointment);
    
    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: APPOINTMENT_REGISTERED_SUCCESS,
        appointment,
      }),
    };
  } catch (error) {
    console.error("Error :", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: APPOINTMENT_REGISTRATION_ERROR }),
    };
  }
};
