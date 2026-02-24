import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useDbStore } from '../store/db';
import { Appointment, AppointmentStatus, AppointmentType, User, Role, Invoice } from '../types';
import { appointmentService } from '../services/appointmentService';
import { userService } from '../services/userService';
import { SlotPickerGrid } from '../components/feature/SlotPickerGrid';
import { InvoiceCard } from '../components/feature/InvoiceCard';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { Calendar, Clock, FileText, Video, MapPin, Edit2, X } from 'lucide-react';
import { format, parse, isAfter } from 'date-fns';

export function PatientDashboard() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'invoices'>('upcoming');
  const { toast } = useToast();

  // Booking/Editing State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; duration: number } | undefined>();
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(AppointmentType.InPerson);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedAppointments, fetchedUsers] = await Promise.all([
          appointmentService.getAppointments(),
          userService.getUsers()
        ]);
        setAppointments(fetchedAppointments);
        setDoctors(fetchedUsers.filter(u => u.role === Role.Doctor && u.isActive));
        
        const allInvoices = useDbStore.getState().invoices;
        setInvoices(allInvoices.filter(inv => inv.patientId === user?.id));
      } catch (error) {
        toast('Failed to load dashboard data', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast, user?.id]);

  const handleOpenBookingModal = (appointment?: Appointment) => {
    if (appointment) {
      setEditingAppointment(appointment);
      setSelectedDoctorId(appointment.doctorId);
      setSelectedDate(parse(appointment.date, 'yyyy-MM-dd', new Date()));
      setSelectedSlot({ startTime: appointment.startTime, duration: appointment.duration });
      setAppointmentType(appointment.type);
    } else {
      setEditingAppointment(null);
      setSelectedDoctorId('');
      setSelectedDate(new Date());
      setSelectedSlot(undefined);
      setAppointmentType(AppointmentType.InPerson);
    }
    setIsBookingModalOpen(true);
  };

  const handleSaveAppointment = async () => {
    if (!selectedDoctorId || !selectedSlot) {
      toast('Please select a doctor and time slot', 'warning');
      return;
    }

    try {
      if (editingAppointment) {
        const updated = await appointmentService.updateAppointment(editingAppointment.id, {
          doctorId: selectedDoctorId,
          date: format(selectedDate, 'yyyy-MM-dd'),
          startTime: selectedSlot.startTime,
          duration: selectedSlot.duration as any,
          type: appointmentType,
        });
        setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
        toast('Appointment updated successfully', 'success');
      } else {
        const newAppointment = await appointmentService.bookAppointment({
          patientId: user!.id,
          doctorId: selectedDoctorId,
          date: format(selectedDate, 'yyyy-MM-dd'),
          startTime: selectedSlot.startTime,
          duration: selectedSlot.duration as any,
          type: appointmentType,
        });
        setAppointments(prev => [...prev, newAppointment]);
        toast('Appointment booked successfully', 'success');
      }
      setIsBookingModalOpen(false);
    } catch (error: any) {
      toast(error.message || 'Failed to save appointment', 'error');
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const updated = await appointmentService.updateStatus(id, AppointmentStatus.Cancelled);
      setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
      toast('Appointment cancelled', 'success');
    } catch (error: any) {
      toast(error.message || 'Failed to cancel appointment', 'error');
    }
  };

  if (isLoading || !user) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;
  }

  const now = new Date();
  const upcomingAppointments = appointments
    .filter(a => a.status === AppointmentStatus.Scheduled || a.status === AppointmentStatus.CheckedIn || a.status === AppointmentStatus.InProgress)
    .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
    
  const pastAppointments = appointments
    .filter(a => a.status === AppointmentStatus.Completed || a.status === AppointmentStatus.Cancelled || a.status === AppointmentStatus.NoShow)
    .sort((a, b) => new Date(`${b.date}T${b.startTime}`).getTime() - new Date(`${a.date}T${a.startTime}`).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hello, {user.name}</h1>
          <p className="text-gray-500">Manage your appointments and health records</p>
        </div>
        <Button onClick={() => handleOpenBookingModal()} className="flex items-center gap-2 shadow-md">
          <Calendar className="w-4 h-4" /> Book Appointment
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'upcoming' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            Upcoming ({upcomingAppointments.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'past' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            Past History
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'invoices' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            Invoices
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'upcoming' && (
            <div className="space-y-4">
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">You have no upcoming appointments.</p>
                  <Button onClick={() => handleOpenBookingModal()}>Book Now</Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {upcomingAppointments.map(apt => {
                    const doctor = doctors.find(d => d.id === apt.doctorId);
                    const aptDate = parse(apt.date, 'yyyy-MM-dd', new Date());
                    
                    return (
                      <div key={apt.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-teal-500" />
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">Dr. {doctor?.name.replace('Dr. ', '')}</h3>
                            <p className="text-sm text-teal-600 font-medium">{doctor?.specialization}</p>
                          </div>
                          <Badge variant={apt.status === AppointmentStatus.CheckedIn ? 'warning' : 'default'}>
                            {apt.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 mb-6">
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{format(aptDate, 'EEEE, MMMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{apt.startTime} ({apt.duration} min)</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            {apt.type === AppointmentType.Video ? <Video className="w-4 h-4 text-gray-400" /> : <MapPin className="w-4 h-4 text-gray-400" />}
                            <span>{apt.type} Consultation</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 pt-4 border-t border-gray-100">
                          <Button variant="outline" size="sm" className="flex-1 flex items-center justify-center gap-2" onClick={() => handleOpenBookingModal(apt)}>
                            <Edit2 className="w-4 h-4" /> Reschedule
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center justify-center gap-2" onClick={() => handleCancelAppointment(apt.id)}>
                            <X className="w-4 h-4" /> Cancel
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'past' && (
            <div className="space-y-4">
              {pastAppointments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No past appointments found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pastAppointments.map(apt => {
                    const doctor = doctors.find(d => d.id === apt.doctorId);
                    const aptDate = parse(apt.date, 'yyyy-MM-dd', new Date());
                    
                    return (
                      <div key={apt.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 border border-gray-200 rounded-lg gap-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">Dr. {doctor?.name.replace('Dr. ', '')}</h4>
                          <p className="text-sm text-gray-500">
                            {format(aptDate, 'MMM d, yyyy')} • {apt.startTime} • {apt.type}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <Badge variant={apt.status === AppointmentStatus.Completed ? 'success' : 'outline'}>
                            {apt.status}
                          </Badge>
                          {apt.status === AppointmentStatus.Completed && (
                            <Button variant="outline" size="sm" className="ml-auto sm:ml-0">
                              View Notes
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {invoices.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No invoices found.</p>
                </div>
              ) : (
                invoices.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()).map(invoice => {
                  const appointment = appointments.find(a => a.id === invoice.appointmentId);
                  const doctor = doctors.find(d => d.id === appointment?.doctorId);
                  
                  if (!appointment || !doctor) return null;

                  return (
                    <InvoiceCard
                      key={invoice.id}
                      invoice={invoice}
                      appointment={appointment}
                      patient={user!}
                      doctor={doctor}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)} 
        title={editingAppointment ? "Reschedule Appointment" : "Book New Appointment"}
        className="max-w-3xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => {
                  setSelectedDoctorId(e.target.value);
                  setSelectedSlot(undefined);
                }}
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- Choose Doctor --</option>
                {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name.replace('Dr. ', '')} - {d.specialization}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type</label>
              <div className="flex flex-col gap-2">
                {Object.values(AppointmentType).map(type => (
                  <button
                    key={type}
                    onClick={() => setAppointmentType(type)}
                    className={`py-2 px-3 text-sm rounded-md border transition-colors text-left ${appointmentType === type ? 'bg-teal-50 border-teal-500 text-teal-700 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => {
                  setSelectedDate(parse(e.target.value, 'yyyy-MM-dd', new Date()));
                  setSelectedSlot(undefined);
                }}
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
            {selectedDoctorId ? (
              <SlotPickerGrid
                doctorId={selectedDoctorId}
                selectedDate={selectedDate}
                onSelectSlot={(startTime, duration) => setSelectedSlot({ startTime, duration })}
                selectedSlot={selectedSlot}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                <Calendar className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm">Select a doctor to view available slots</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsBookingModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveAppointment} disabled={!selectedDoctorId || !selectedSlot}>
            {editingAppointment ? 'Save Changes' : 'Confirm Booking'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
