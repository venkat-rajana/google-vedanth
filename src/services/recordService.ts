import { useDbStore } from '../store/db';
import { useAuthStore } from '../store/auth';
import { MedicalRecord, Role } from '../types';

export const recordService = {
  async getRecords(): Promise<MedicalRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Unauthorized');

    const allRecords = useDbStore.getState().records;

    if (user.role === Role.Admin) {
      return allRecords;
    } else if (user.role === Role.Doctor) {
      return allRecords.filter(r => r.doctorId === user.id);
    } else if (user.role === Role.Patient) {
      return allRecords.filter(r => r.patientId === user.id);
    }
    
    return [];
  }
};
