import { useDbStore } from '../store/db';
import { Appointment, AppointmentStatus, AppointmentType, Role } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '../store/auth';
import { addMinutes, parse, format, isBefore, isAfter, isEqual } from 'date-fns';

export const appointmentService = {
  async getAppointments(): Promise<Appointment[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Unauthorized');

    const allAppointments = useDbStore.getState().appointments;

    if (user.role === Role.Admin || user.role === Role.Staff) {
      return allAppointments;
    } else if (user.role === Role.Doctor) {
      return allAppointments.filter(a => a.doctorId === user.id);
    } else if (user.role === Role.Patient) {
      return allAppointments.filter(a => a.patientId === user.id);
    }
    return [];
  },

  async bookAppointment(data: Omit<Appointment, 'id' | 'status' | 'version' | 'createdAt' | 'updatedAt'>): Promise<Appointment> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const state = useDbStore.getState();
    const user = useAuthStore.getState().user;
    
    if (!user) throw new Error('Unauthorized');

    // Conflict detection
    const hasConflict = state.appointments.some(a => {
      if (a.doctorId !== data.doctorId || a.date !== data.date || a.status === AppointmentStatus.Cancelled) return false;
      
      const newStart = parse(data.startTime, 'HH:mm', new Date());
      const newEnd = addMinutes(newStart, data.duration);
      
      const existingStart = parse(a.startTime, 'HH:mm', new Date());
      const existingEnd = addMinutes(existingStart, a.duration);
      
      return (isBefore(newStart, existingEnd) && isAfter(newEnd, existingStart)) || isEqual(newStart, existingStart);
    });

    if (hasConflict) {
      throw new Error('This slot was just taken. Please select another.');
    }

    const newAppointment: Appointment = {
      ...data,
      id: uuidv4(),
      status: AppointmentStatus.Scheduled,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.setAppointments([...state.appointments, newAppointment]);
    
    state.addAuditLog({
      userId: user.id,
      action: 'BOOK_APPOINTMENT',
      targetId: newAppointment.id,
      targetType: 'Appointment',
      ipNote: '127.0.0.1'
    });

    return newAppointment;
  },

  async updateAppointment(id: string, data: Partial<Omit<Appointment, 'id' | 'version' | 'createdAt' | 'updatedAt'>>): Promise<Appointment> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const state = useDbStore.getState();
    const user = useAuthStore.getState().user;
    
    if (!user) throw new Error('Unauthorized');

    const appointmentIndex = state.appointments.findIndex(a => a.id === id);
    if (appointmentIndex === -1) throw new Error('Appointment not found');

    const appointment = state.appointments[appointmentIndex];

    // Check for conflicts if date, time, duration, or doctor is changing
    if (data.date || data.startTime || data.duration || data.doctorId) {
      const checkDate = data.date || appointment.date;
      const checkStartTime = data.startTime || appointment.startTime;
      const checkDuration = data.duration || appointment.duration;
      const checkDoctorId = data.doctorId || appointment.doctorId;

      const hasConflict = state.appointments.some(a => {
        if (a.id === id) return false; // Ignore self
        if (a.doctorId !== checkDoctorId || a.date !== checkDate || a.status === AppointmentStatus.Cancelled) return false;
        
        const newStart = parse(checkStartTime, 'HH:mm', new Date());
        const newEnd = addMinutes(newStart, checkDuration);
        
        const existingStart = parse(a.startTime, 'HH:mm', new Date());
        const existingEnd = addMinutes(existingStart, a.duration);
        
        return (isBefore(newStart, existingEnd) && isAfter(newEnd, existingStart)) || isEqual(newStart, existingStart);
      });

      if (hasConflict) {
        throw new Error('This slot conflicts with another appointment.');
      }
    }

    const updatedAppointment = {
      ...appointment,
      ...data,
      version: appointment.version + 1,
      updatedAt: new Date().toISOString()
    };

    const newAppointments = [...state.appointments];
    newAppointments[appointmentIndex] = updatedAppointment;
    state.setAppointments(newAppointments);

    state.addAuditLog({
      userId: user.id,
      action: 'UPDATE_APPOINTMENT',
      targetId: id,
      targetType: 'Appointment',
      ipNote: '127.0.0.1'
    });

    return updatedAppointment;
  },

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const state = useDbStore.getState();
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Unauthorized');

    const appointmentIndex = state.appointments.findIndex(a => a.id === id);
    if (appointmentIndex === -1) throw new Error('Appointment not found');

    const appointment = state.appointments[appointmentIndex];
    
    const updatedAppointment = {
      ...appointment,
      status,
      version: appointment.version + 1,
      updatedAt: new Date().toISOString()
    };

    const newAppointments = [...state.appointments];
    newAppointments[appointmentIndex] = updatedAppointment;
    state.setAppointments(newAppointments);

    state.addAuditLog({
      userId: user.id,
      action: `UPDATE_STATUS_${status}`,
      targetId: id,
      targetType: 'Appointment',
      ipNote: '127.0.0.1'
    });

    return updatedAppointment;
  },

  async addClinicalNotes(id: string, diagnosis: string, prescription: string): Promise<Appointment> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const state = useDbStore.getState();
    const user = useAuthStore.getState().user;
    if (!user || user.role !== Role.Doctor) throw new Error('Unauthorized');

    const appointmentIndex = state.appointments.findIndex(a => a.id === id);
    if (appointmentIndex === -1) throw new Error('Appointment not found');

    const appointment = state.appointments[appointmentIndex];
    
    const updatedAppointment = {
      ...appointment,
      diagnosis,
      prescription,
      version: appointment.version + 1,
      updatedAt: new Date().toISOString()
    };

    const newAppointments = [...state.appointments];
    newAppointments[appointmentIndex] = updatedAppointment;
    state.setAppointments(newAppointments);
    
    // Create medical record
    const newRecord = {
      id: uuidv4(),
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentId: appointment.id,
      diagnosis,
      prescription,
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    state.setRecords([...state.records, newRecord]);

    state.addAuditLog({
      userId: user.id,
      action: 'ADD_CLINICAL_NOTES',
      targetId: id,
      targetType: 'Appointment',
      ipNote: '127.0.0.1'
    });

    return updatedAppointment;
  }
};
