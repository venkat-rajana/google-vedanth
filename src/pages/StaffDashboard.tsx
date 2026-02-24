import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useDbStore } from '../store/db';
import { Appointment, AppointmentStatus, AppointmentType, User, Role, Invoice } from '../types';
import { appointmentService } from '../services/appointmentService';
import { userService } from '../services/userService';
import { exportService } from '../services/exportService';
import { SlotPickerGrid } from '../components/feature/SlotPickerGrid';
import { InvoiceCard } from '../components/feature/InvoiceCard';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { Calendar, Users, FileText, CheckCircle, Clock, Search, UserPlus } from 'lucide-react';
import { format, parse, isSameDay } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export function StaffDashboard() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'booking' | 'billing'>('queue');
  const { toast } = useToast();

  // Booking State
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; duration: number } | undefined>();
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(AppointmentType.InPerson);

  // New Patient State
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    name: '',
    email: '',
    phone: '',
    aadharNumber: ''
  });

  // Edit Patient State
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<User | null>(null);
  const [editPatientData, setEditPatientData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    aadharNumber: ''
  });

  // Filter States
  const [filterStartDate, setFilterStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [filterEndDate, setFilterEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [filterStatus, setFilterStatus] = useState<string>('active'); // 'all', 'active', or specific status
  const [filterDoctorId, setFilterDoctorId] = useState<string>('all');
  const [filterPatientId, setFilterPatientId] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedAppointments, fetchedUsers] = await Promise.all([
          appointmentService.getAppointments(),
          userService.getUsers()
        ]);
        setAppointments(fetchedAppointments);
        setUsers(fetchedUsers);
        setInvoices(useDbStore.getState().invoices);
      } catch (error) {
        toast('Failed to load dashboard data', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const doctors = users.filter(u => u.role === Role.Doctor && u.isActive);
  const patients = users.filter(u => u.role === Role.Patient && u.isActive);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientData.aadharNumber) {
      toast('Aadhar number is mandatory', 'warning');
      return;
    }
    try {
      // Check if Aadhar already exists
      if (patients.some(p => p.aadharNumber === newPatientData.aadharNumber)) {
        toast('A patient with this Aadhar number already exists', 'error');
        return;
      }
      
      const addedPatient = await userService.addUser({
        ...newPatientData,
        role: Role.Patient,
        password: 'Password@123', // Default password for walk-ins
      });
      setUsers(prev => [...prev, addedPatient]);
      setSelectedPatientId(addedPatient.id);
      setIsAddPatientModalOpen(false);
      setNewPatientData({ name: '', email: '', phone: '', aadharNumber: '' });
      toast('Patient registered successfully', 'success');
    } catch (error: any) {
      toast(error.message || 'Failed to register patient', 'error');
    }
  };

  const handleEditPatient = (patient: User) => {
    setEditingPatient(patient);
    setEditPatientData({
      name: patient.name,
      email: patient.email,
      phone: patient.phone || '',
      address: patient.address || '',
      aadharNumber: patient.aadharNumber || ''
    });
    setIsEditPatientModalOpen(true);
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    
    try {
      const updatedPatient = await userService.updateUser(editingPatient.id, editPatientData);
      setUsers(prev => prev.map(u => u.id === updatedPatient.id ? updatedPatient : u));
      setIsEditPatientModalOpen(false);
      setEditingPatient(null);
      toast('Patient updated successfully', 'success');
    } catch (error: any) {
      toast(error.message || 'Failed to update patient', 'error');
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctorId || !selectedPatientId || !selectedSlot) {
      toast('Please select doctor, patient, and time slot', 'warning');
      return;
    }

    try {
      const newAppointment = await appointmentService.bookAppointment({
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedSlot.startTime,
        duration: selectedSlot.duration as any,
        type: appointmentType,
      });
      
      setAppointments(prev => [...prev, newAppointment]);
      setSelectedSlot(undefined);
      toast('Appointment booked successfully', 'success');
      setActiveTab('queue');
    } catch (error: any) {
      toast(error.message || 'Failed to book appointment', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, status: AppointmentStatus) => {
    try {
      const updated = await appointmentService.updateStatus(id, status);
      setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
      toast(`Appointment marked as ${status}`, 'success');
      
      if (status === AppointmentStatus.Completed) {
        generateInvoice(updated);
      }
    } catch (error: any) {
      toast(error.message || 'Failed to update status', 'error');
    }
  };

  const generateInvoice = (appointment: Appointment) => {
    const doctor = users.find(u => u.id === appointment.doctorId);
    const baseAmount = appointment.duration === 15 ? 50 : appointment.duration === 30 ? 100 : 150;
    
    const newInvoice: Invoice = {
      id: uuidv4(),
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      items: [
        { description: `Consultation with ${doctor?.name || 'Doctor'} (${appointment.duration} min)`, amount: baseAmount }
      ],
      totalAmount: baseAmount,
      status: 'pending',
      generatedAt: new Date().toISOString()
    };

    const state = useDbStore.getState();
    state.setInvoices([...state.invoices, newInvoice]);
    setInvoices(prev => [...prev, newInvoice]);
    toast('Invoice generated automatically', 'info');
  };

  const handleUpdateInvoiceStatus = (id: string, status: 'paid' | 'waived') => {
    const state = useDbStore.getState();
    const updatedInvoices = state.invoices.map(inv => inv.id === id ? { ...inv, status } : inv);
    state.setInvoices(updatedInvoices);
    setInvoices(updatedInvoices);
    toast(`Invoice marked as ${status}`, 'success');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;
  }

  const today = new Date();
  
  const queueAppointments = appointments
    .filter(a => {
      // Date filter
      if (a.date < filterStartDate || a.date > filterEndDate) return false;
      
      // Status filter
      if (filterStatus === 'active') {
        if (a.status === AppointmentStatus.Cancelled || a.status === AppointmentStatus.Completed) return false;
      } else if (filterStatus !== 'all') {
        if (a.status !== filterStatus) return false;
      }
      
      // Doctor filter
      if (filterDoctorId !== 'all' && a.doctorId !== filterDoctorId) return false;
      
      // Patient filter
      if (filterPatientId !== 'all' && a.patientId !== filterPatientId) return false;
      
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Front Desk Dashboard</h1>
          <p className="text-gray-500">Manage daily queue, bookings, and billing</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'queue' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" /> Today's Queue
            </div>
          </button>
          <button
            onClick={() => setActiveTab('booking')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'booking' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" /> Walk-in Booking
            </div>
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'billing' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" /> Billing & Invoices
            </div>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Appointments</h3>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">From</span>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">To</span>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Queue</option>
                    {Object.values(AppointmentStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <select
                    value={filterDoctorId}
                    onChange={(e) => setFilterDoctorId(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="all">All Doctors</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <select
                    value={filterPatientId}
                    onChange={(e) => setFilterPatientId(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-500 max-w-[150px]"
                  >
                    <option value="all">All Patients</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              
              {queueAppointments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No active appointments in the queue.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {queueAppointments.map(apt => {
                    const patient = users.find(u => u.id === apt.patientId);
                    const doctor = users.find(u => u.id === apt.doctorId);
                    return (
                      <div key={apt.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow gap-4">
                        <div className="flex items-start gap-4">
                          <div className="bg-teal-100 text-teal-800 px-3 py-2 rounded-md text-center min-w-[80px]">
                            <p className="text-sm font-bold">{apt.startTime}</p>
                            <p className="text-xs">{apt.duration}m</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-lg">{patient?.name}</h4>
                            <p className="text-sm text-gray-500">with Dr. {doctor?.name.replace('Dr. ', '')}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{apt.type}</Badge>
                              <Badge variant={apt.status === AppointmentStatus.CheckedIn ? 'warning' : apt.status === AppointmentStatus.InProgress ? 'info' : 'default'}>
                                {apt.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          {apt.status === AppointmentStatus.Scheduled && (
                            <Button onClick={() => handleUpdateStatus(apt.id, AppointmentStatus.CheckedIn)} className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white">
                              Check In
                            </Button>
                          )}
                          {apt.status === AppointmentStatus.CheckedIn && (
                            <Button onClick={() => handleUpdateStatus(apt.id, AppointmentStatus.InProgress)} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white">
                              Start Session
                            </Button>
                          )}
                          {apt.status === AppointmentStatus.InProgress && (
                            <Button onClick={() => handleUpdateStatus(apt.id, AppointmentStatus.Completed)} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                              Complete
                            </Button>
                          )}
                          {apt.status !== AppointmentStatus.Completed && (
                            <Button variant="outline" onClick={() => handleUpdateStatus(apt.id, AppointmentStatus.Cancelled)} className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50">
                              Cancel
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

          {activeTab === 'booking' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Select Patient</label>
                    <div className="flex gap-2">
                      {selectedPatientId && (
                        <Button variant="link" size="sm" onClick={() => handleEditPatient(patients.find(p => p.id === selectedPatientId)!)} className="h-auto p-0 text-teal-600">
                          Edit Patient
                        </Button>
                      )}
                      <Button variant="link" size="sm" onClick={() => setIsAddPatientModalOpen(true)} className="h-auto p-0 text-teal-600">
                        + Add New Patient
                      </Button>
                    </div>
                  </div>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phone || p.email})</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Doctor</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Choose Doctor --</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.name} - {d.specialization}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Appointment Type</label>
                  <div className="flex gap-2">
                    {Object.values(AppointmentType).map(type => (
                      <button
                        key={type}
                        onClick={() => setAppointmentType(type)}
                        className={`flex-1 py-2 px-3 text-sm rounded-md border transition-colors ${appointmentType === type ? 'bg-teal-50 border-teal-500 text-teal-700 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setSelectedDate(parse(e.target.value, 'yyyy-MM-dd', new Date()))}
                    className="w-full rounded-md border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="lg:col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-200">
                {selectedDoctorId ? (
                  <>
                    <SlotPickerGrid
                      doctorId={selectedDoctorId}
                      selectedDate={selectedDate}
                      onSelectSlot={(startTime, duration) => setSelectedSlot({ startTime, duration })}
                      selectedSlot={selectedSlot}
                    />
                    
                    <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                      <Button
                        onClick={handleBookAppointment}
                        disabled={!selectedPatientId || !selectedSlot}
                        className="w-full sm:w-auto px-8"
                      >
                        Confirm Booking
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                    <Calendar className="w-16 h-16 mb-4 opacity-50" />
                    <p>Select a doctor to view available slots</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {invoices.length === 0 ? (
                  <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No invoices generated yet.</p>
                  </div>
                ) : (
                  invoices.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()).map(invoice => {
                    const appointment = appointments.find(a => a.id === invoice.appointmentId);
                    const patient = users.find(u => u.id === invoice.patientId);
                    const doctor = users.find(u => u.id === appointment?.doctorId);
                    
                    if (!appointment || !patient || !doctor) return null;

                    return (
                      <InvoiceCard
                        key={invoice.id}
                        invoice={invoice}
                        appointment={appointment}
                        patient={patient}
                        doctor={doctor}
                        onUpdateStatus={handleUpdateInvoiceStatus}
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isAddPatientModalOpen} onClose={() => setIsAddPatientModalOpen(false)} title="Add New Patient">
        <form onSubmit={handleAddPatient} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={newPatientData.name}
              onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={newPatientData.email}
              onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              required
              value={newPatientData.phone}
              onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={newPatientData.aadharNumber}
              onChange={(e) => setNewPatientData({ ...newPatientData, aadharNumber: e.target.value })}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-teal-500"
              placeholder="12-digit Aadhar Number"
              pattern="\d{12}"
              title="Aadhar number must be exactly 12 digits"
            />
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAddPatientModalOpen(false)}>Cancel</Button>
            <Button type="submit">Add Patient</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditPatientModalOpen} onClose={() => setIsEditPatientModalOpen(false)} title="Edit Patient">
        <form onSubmit={handleUpdatePatient} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={editPatientData.name}
              onChange={(e) => setEditPatientData({ ...editPatientData, name: e.target.value })}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={editPatientData.email}
              onChange={(e) => setEditPatientData({ ...editPatientData, email: e.target.value })}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              required
              value={editPatientData.phone}
              onChange={(e) => setEditPatientData({ ...editPatientData, phone: e.target.value })}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={editPatientData.address}
              onChange={(e) => setEditPatientData({ ...editPatientData, address: e.target.value })}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
            <input
              type="text"
              value={editPatientData.aadharNumber}
              onChange={(e) => setEditPatientData({ ...editPatientData, aadharNumber: e.target.value })}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-teal-500"
              placeholder="12-digit Aadhar Number"
              pattern="\d{12}"
              title="Aadhar number must be exactly 12 digits"
            />
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsEditPatientModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
