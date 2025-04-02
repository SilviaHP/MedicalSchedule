import { v4 as uuidv4 } from "uuid";

export class Appointment {
    appointmentId?: string
    insuredId: string;
    scheduleId: string;
    centerId: string;
    specialtyId: string;
    medicId:string;
    dateSchedule: string;
    dateCreated?: string;
    countryISO: string;
    status?: string;

    constructor(

        insuredId: string, 
        scheduleId: string, 
        centerId: string,
        specialtyId: string,
        medicId:string,
        dateSchedule: string, 
        countryISO: string) 
        {

        this.appointmentId = uuidv4();
        this.insuredId = insuredId;
        this.scheduleId = scheduleId;
        this.centerId = centerId;
        this.specialtyId = specialtyId;
        this.medicId = medicId;
        this.dateSchedule = dateSchedule;
        this.dateCreated = new Date().toISOString();
        this.countryISO = countryISO;
        this.status = "PENDING";
    }


    toJSON(): object {
        return {
            appointmentId: this.appointmentId,
            insuredId: this.insuredId,
            scheduleId: this.scheduleId,
            centerId: this.centerId,
            specialtyId: this.specialtyId,
            medicId: this.medicId,  
            dateSchedule: this.dateSchedule,
            dateCreated: this.dateCreated,
            countryISO: this.countryISO,
            status: this.status,
        };
    }
  }
  