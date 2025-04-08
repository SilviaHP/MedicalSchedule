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
        region: process.env.DEMO_REGION || "us-east-1"
      });
    }
    return EventBridgeClientInstance.instance;
  }
}

// envia un evento de confirmación de cita al bus de eventos
export const sendAppointmentConfirmation = async (
  appointmentData: any,
  country: string
): Promise<void> => {
  try {
    const client = EventBridgeClientInstance.getInstance();
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

    await client.send(new PutEventsCommand(params));
    
  } catch (error) {
    console.error("Error en sendAppointmentConfirmation:", error);
    throw error;
  }
};