import { Appointment } from "../entities/appointment";

// Definición de la interfaz del repositorio de citas   
export interface AppointmentRepository {
    
  save(appointment: Appointment): Promise<void>;
  getByInsureId(insuredId: string): Promise<Appointment | null>;   //insuredId
}
