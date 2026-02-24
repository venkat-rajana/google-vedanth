import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useDbStore } from '../store/db';
import { Appointment, AppointmentStatus, User, Role } from '../types';
import { appointmentService } from '../services/appointmentService';
import { WeeklyCalendarGrid } from '../components/feature/WeeklyCalendarGrid';
import { PresenceIndicator } from '../components/feature/PresenceIndicator';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { FileText, CheckCircle, Clock, FileSignature } from 'lucide-react';
import { format, parse } from 'date-fns';

export function DoctorDashboard() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedAppointments = await appointmentService.getAppointments();
        setAppointments(fetchedAppointments);
        setUsers(useDbStore.getState().users);
      } catch (error) {
        toast('Failed to load appointments', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDiagnosis(appointment.diagnosis || '');
    setPrescription(appointment.prescription || '');
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (status: AppointmentStatus) => {
    if (!selectedAppointment) return;
    try {
      const updated = await appointmentService.updateStatus(selectedAppointment.id, status);
      setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
      setSelectedAppointment(updated);
      toast(`Appointment marked as ${status}`, 'success');
    } catch (error: any) {
      toast(error.message || 'Failed to update status', 'error');
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedAppointment) return;
    try {
      const updated = await appointmentService.addClinicalNotes(selectedAppointment.id, diagnosis, prescription);
      setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
      setSelectedAppointment(updated);
      toast('Clinical notes saved successfully', 'success');
    } catch (error: any) {
      toast(error.message || 'Failed to save notes', 'error');
    }
  };

  if (isLoading || !user) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;
  }

  const patient = selectedAppointment ? users.find(u => u.id === selectedAppointment.patientId) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
          <p className="text-gray-500">{user.specialization}</p>
        </div>
        <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
          <span className="text-sm font-medium text-gray-700">Current Status:</span>
          <PresenceIndicator doctorId={user.id} />
        </div>
      </div>

      <WeeklyCalendarGrid appointments={appointments} onAppointmentClick={handleAppointmentClick} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Appointment Details" className="max-w-2xl">
        {selectedAppointment && patient && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{patient.name}</h3>
                <p className="text-sm text-gray-500">{patient.email} • {patient.phone || 'No phone'}</p>
              </div>
              <Badge variant={selectedAppointment.status === AppointmentStatus.Completed ? 'success' : 'default'}>
                {selectedAppointment.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {format(parse(selectedAppointment.date, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')} • {selectedAppointment.startTime}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Type & Duration</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {selectedAppointment.type} • {selectedAppointment.duration} min
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" /> Clinical Notes
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis / Observations</label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full h-24 rounded-md border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Enter diagnosis notes..."
                  disabled={selectedAppointment.status === AppointmentStatus.Completed}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prescription / Treatment Plan</label>
                <textarea
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  className="w-full h-24 rounded-md border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Enter prescription details..."
                  disabled={selectedAppointment.status === AppointmentStatus.Completed}
                />
              </div>

              {selectedAppointment.status !== AppointmentStatus.Completed && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveNotes} variant="outline" className="flex items-center gap-2">
                    <FileSignature className="w-4 h-4" /> Save Notes
                  </Button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
              <div className="flex gap-2">
                {selectedAppointment.status === AppointmentStatus.CheckedIn && (
                  <Button onClick={() => handleUpdateStatus(AppointmentStatus.InProgress)} className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Start Session
                  </Button>
                )}
                {selectedAppointment.status === AppointmentStatus.InProgress && (
                  <Button onClick={() => handleUpdateStatus(AppointmentStatus.Completed)} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Complete Session
                  </Button>
                )}
              </div>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
