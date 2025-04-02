import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandInput,
} from "@aws-sdk/client-eventbridge";

// crea una instancia de EventBridgeClient
export class EventBridgeClientInstance {
  private static instance: EventBridgeClient;

  private constructor() {}

  public static getInstance(): EventBridgeClient {
    if (!EventBridgeClientInstance.instance) {
      EventBridgeClientInstance.instance = new EventBridgeClient({
        region: process.env.DEMO_REGION || "us-east-1",
      });
    }
    return EventBridgeClientInstance.instance;
  }
}

// Envía un evento de confirmación de cita al bus de eventos
// @param appointmentData Datos de la cita procesada
// @param country Código de país: PE o CL

export const sendAppointmentConfirmation = async (
  appointmentData: any,
  country: string
): Promise<void> => {
  try {
    console.log(
      `Enviando confirmación para cita ${appointmentData.appointmentId} a EventBridge`
    );


    const client = EventBridgeClientInstance.getInstance();
    console.log(
      `[CONFIG] Usando región: ${process.env.DEMO_REGION}, bus: ${
        process.env.EVENT_BUS_NAME || "appointment-events-bus"
      }`
    );

    // crea el comando PutEvents con los datos del evento
    const params: PutEventsCommandInput = {
      Entries: [
        {
          Source: "appointment.service",
          DetailType: "AppointmentConfirmation",
          Detail: JSON.stringify({
            appointmentId: appointmentData.appointmentId,
            insuredId: appointmentData.insuredId,
            status: "CONFIRMED",
            countryISO: country,
            processingDate: new Date().toISOString(),
            appointmentData: appointmentData,
          }),
          EventBusName: process.env.EVENT_BUS_NAME || "appointment-events-bus",
        },
      ],
    };

    // crear el comando y enviarlo
    const command = new PutEventsCommand(params);
    const result = await client.send(command);

    console.log(
      "Evento enviado a EventBridge, despues del client.send:",
      result
    );

    // Verificar si hubo errores
    if (result.FailedEntryCount && result.FailedEntryCount > 0) {
      console.error(
        "Error al enviar eventos a EventBridge:",
        result.Entries?.filter((entry) => entry.ErrorCode)
      );
      throw new Error(
        `Error al enviar evento a EventBridge: ${result.Entries?.[0]?.ErrorMessage}`
      );
    }
  } catch (error) {
    console.error("Error en sendAppointmentConfirmation:", error);
    throw error;
  }
};
