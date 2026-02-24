import { useDbStore } from '../store/db';
import { useAuthStore } from '../store/auth';
import { Role } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportService = {
  async exportAppointmentsCSV(): Promise<void> {
    const user = useAuthStore.getState().user;
    if (!user || user.role !== Role.Admin) throw new Error('Unauthorized');

    const appointments = useDbStore.getState().appointments;
    const csvContent = [
      ['ID', 'Date', 'Time', 'Duration', 'Type', 'Status', 'Patient ID', 'Doctor ID'].join(','),
      ...appointments.map(a => [a.id, a.date, a.startTime, a.duration, a.type, a.status, a.patientId, a.doctorId].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('url');
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  async exportFullBackupJSON(): Promise<void> {
    const user = useAuthStore.getState().user;
    if (!user || user.role !== Role.Admin) throw new Error('Unauthorized');

    const state = useDbStore.getState();
    const backup = {
      users: state.users,
      appointments: state.appointments,
      records: state.records,
      invoices: state.invoices,
      auditLogs: state.auditLogs,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `vedanth_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  async generatePDF(elementId: string, filename: string): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) throw new Error('Element not found');

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  }
};
