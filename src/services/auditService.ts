import { useDbStore } from '../store/db';
import { useAuthStore } from '../store/auth';
import { AuditLog, Role } from '../types';

export const auditService = {
  async getAuditLogs(): Promise<AuditLog[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const user = useAuthStore.getState().user;
    if (!user || user.role !== Role.Admin) throw new Error('Unauthorized');

    return useDbStore.getState().auditLogs;
  }
};
