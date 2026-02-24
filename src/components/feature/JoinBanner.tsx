import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth';
import { useDbStore } from '../../store/db';
import { Appointment, AppointmentStatus, AppointmentType, Role } from '../../types';
import { parse, differenceInMinutes, isBefore, addMinutes } from 'date-fns';
import { Video, CheckCircle, X } from 'lucide-react';
import { appointmentService } from '../../services/appointmentService';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';

export function JoinBanner() {
  const { user } = useAuthStore();
  const appointments = useDbStore(state => state.appointments);
  const users = useDbStore(state => state.users);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const checkAppointments = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      const relevantAppointments = appointments.filter(a => {
        if (a.date !== todayStr) return false;
        if (a.status === AppointmentStatus.Completed || a.status === AppointmentStatus.Cancelled || a.status === AppointmentStatus.NoShow) return false;
        if (user.role === Role.Doctor && a.doctorId !== user.id) return false;
        if (user.role === Role.Patient && a.patientId !== user.id) return false;
        if (dismissed.includes(a.id)) return false;

        const startTime = parse(a.startTime, 'HH:mm', now);
        const diff = differenceInMinutes(startTime, now);
        
        // Show banner 15 minutes before, until the end of the appointment
        const endTime = addMinutes(startTime, a.duration);
        return diff <= 15 && isBefore(now, endTime);
      });

      if (relevantAppointments.length > 0) {
        // Sort by closest start time
        relevantAppointments.sort((a, b) => {
          const startA = parse(a.startTime, 'HH:mm', now);
          const startB = parse(b.startTime, 'HH:mm', now);
          return Math.abs(differenceInMinutes(startA, now)) - Math.abs(differenceInMinutes(startB, now));
        });

        const closest = relevantAppointments[0];
        setActiveAppointment(closest);
        
        const startTime = parse(closest.startTime, 'HH:mm', now);
        setMinutesLeft(differenceInMinutes(startTime, now));
      } else {
        setActiveAppointment(null);
        setMinutesLeft(null);
      }
    };

    checkAppointments();
    const interval = setInterval(checkAppointments, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user, appointments, dismissed]);

  if (!activeAppointment || minutesLeft === null) return null;

  const otherPersonId = user?.role === Role.Doctor ? activeAppointment.patientId : activeAppointment.doctorId;
  const otherPerson = users.find(u => u.id === otherPersonId);
  const name = otherPerson?.name || 'Unknown';

  const handleCheckIn = async () => {
    try {
      await appointmentService.updateStatus(activeAppointment.id, AppointmentStatus.CheckedIn);
      toast('Checked in successfully', 'success');
    } catch (error: any) {
      toast(error.message || 'Failed to check in', 'error');
    }
  };

  const handleDismiss = () => {
    setDismissed(prev => [...prev, activeAppointment.id]);
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-teal-600 text-white shadow-md animate-in slide-in-from-top-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            {activeAppointment.type === AppointmentType.Video ? <Video className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          </div>
          <div>
            <p className="font-medium">
              Your appointment with {name} {minutesLeft > 0 ? `starts in ${minutesLeft} minutes` : 'has started'}
            </p>
            <p className="text-sm text-teal-100">
              {activeAppointment.startTime} ({activeAppointment.duration} min) • {activeAppointment.type}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {activeAppointment.status === AppointmentStatus.Scheduled && user?.role === Role.Patient && (
            <Button variant="secondary" size="sm" onClick={handleCheckIn} className="bg-white text-teal-700 hover:bg-gray-100">
              Check In
            </Button>
          )}
          {activeAppointment.type === AppointmentType.Video && (
            <Button variant="secondary" size="sm" className="bg-white text-teal-700 hover:bg-gray-100 flex items-center gap-2">
              <Video className="w-4 h-4" />
              Join Call
            </Button>
          )}
          <button onClick={handleDismiss} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
