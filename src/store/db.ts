import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Appointment, MedicalRecord, Invoice, AuditLog, Role, AppointmentStatus, AppointmentType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { addDays, format } from 'date-fns';

interface DatabaseState {
  users: User[];
  appointments: Appointment[];
  records: MedicalRecord[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  
  // Actions
  setUsers: (users: User[]) => void;
  setAppointments: (appointments: Appointment[]) => void;
  setRecords: (records: MedicalRecord[]) => void;
  setInvoices: (invoices: Invoice[]) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  resetDb: () => void;
}

const today = new Date();

const initialUsers: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@vedanth.com', role: Role.Admin, password: 'Admin@123', isActive: true, createdAt: new Date().toISOString() },
  { id: 'u2', name: 'Dr. Priya Sharma', email: 'doctor@vedanth.com', role: Role.Doctor, specialization: 'Cardiologist', password: 'Doctor@123', isActive: true, createdAt: new Date().toISOString() },
  { id: 'u3', name: 'Dr. Arjun Mehta', email: 'doctor2@vedanth.com', role: Role.Doctor, specialization: 'General Physician', password: 'Doctor@123', isActive: true, createdAt: new Date().toISOString() },
  { id: 'u4', name: 'Ravi Kumar', email: 'staff@vedanth.com', role: Role.Staff, password: 'Staff@123', isActive: true, createdAt: new Date().toISOString() },
  { id: 'u5', name: 'John Doe', email: 'patient@vedanth.com', role: Role.Patient, password: 'Patient@123', isActive: true, createdAt: new Date().toISOString(), phone: '1234567890', address: '123 Main St' },
  { id: 'u6', name: 'Jane Smith', email: 'patient2@vedanth.com', role: Role.Patient, password: 'Patient@123', isActive: true, createdAt: new Date().toISOString() },
];

const initialAppointments: Appointment[] = [
  {
    id: 'a1', patientId: 'u5', doctorId: 'u2', date: format(today, 'yyyy-MM-dd'), startTime: '09:00', duration: 30, type: AppointmentType.InPerson, status: AppointmentStatus.Scheduled, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  },
  {
    id: 'a2', patientId: 'u6', doctorId: 'u2', date: format(today, 'yyyy-MM-dd'), startTime: '10:00', duration: 30, type: AppointmentType.Video, status: AppointmentStatus.CheckedIn, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  },
  {
    id: 'a3', patientId: 'u5', doctorId: 'u3', date: format(addDays(today, 1), 'yyyy-MM-dd'), startTime: '14:00', duration: 15, type: AppointmentType.FollowUp, status: AppointmentStatus.Scheduled, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  },
  {
    id: 'a4', patientId: 'u6', doctorId: 'u3', date: format(addDays(today, -1), 'yyyy-MM-dd'), startTime: '11:00', duration: 45, type: AppointmentType.InPerson, status: AppointmentStatus.Completed, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), diagnosis: 'Common cold', prescription: 'Rest and fluids'
  },
];

const initialRecords: MedicalRecord[] = [
  {
    id: 'r1', patientId: 'u6', doctorId: 'u3', appointmentId: 'a4', diagnosis: 'Common cold', prescription: 'Rest and fluids', attachments: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }
];

export const useDbStore = create<DatabaseState>()(
  persist(
    (set, get) => ({
      users: initialUsers,
      appointments: initialAppointments,
      records: initialRecords,
      invoices: [],
      auditLogs: [],
      
      setUsers: (users) => set({ users }),
      setAppointments: (appointments) => set({ appointments }),
      setRecords: (records) => set({ records }),
      setInvoices: (invoices) => set({ invoices }),
      addAuditLog: (log) => set((state) => ({
        auditLogs: [...state.auditLogs, { ...log, id: uuidv4(), timestamp: new Date().toISOString() }]
      })),
      resetDb: () => set({ users: initialUsers, appointments: initialAppointments, records: initialRecords, invoices: [], auditLogs: [] }),
    }),
    {
      name: 'vedanth-clinic-db',
    }
  )
);
