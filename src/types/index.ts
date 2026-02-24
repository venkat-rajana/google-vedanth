export enum Role {
  Admin = 'Admin',
  Doctor = 'Doctor',
  Staff = 'Staff',
  Patient = 'Patient',
}

export enum AppointmentStatus {
  Scheduled = 'Scheduled',
  CheckedIn = 'CheckedIn',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  NoShow = 'NoShow',
}

export enum AppointmentType {
  InPerson = 'InPerson',
  Video = 'Video',
  FollowUp = 'FollowUp',
}

export enum DoctorPresence {
  Available = 'Available',
  InSession = 'InSession',
  OnLeave = 'OnLeave',
  Offline = 'Offline',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  specialization?: string; // For Doctors
  phone?: string;
  address?: string;
  createdAt: string;
  isActive: boolean;
  password?: string; // Hashed in a real app
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string; // ISO string (YYYY-MM-DD)
  startTime: string; // HH:MM
  duration: 15 | 30 | 45 | 60;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string; // pre-visit
  diagnosis?: string; // post-visit
  prescription?: string; // post-visit
  invoiceId?: string;
  version: number; // optimistic locking
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId: string;
  diagnosis: string;
  prescription: string;
  labResults?: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  appointmentId: string;
  patientId: string;
  items: InvoiceItem[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'waived';
  generatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  targetId: string;
  targetType: string;
  timestamp: string;
  ipNote: string;
}
