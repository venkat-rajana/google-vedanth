import React, { useEffect, useState } from 'react';
import { DoctorPresence, AppointmentStatus } from '../../types';
import { useDbStore } from '../../store/db';
import { parse, isWithinInterval, addMinutes } from 'date-fns';
import { cn } from '../../lib/utils';

interface PresenceIndicatorProps {
  doctorId: string;
  className?: string;
  isEditable?: boolean;
}

export function PresenceIndicator({ doctorId, className, isEditable = false }: PresenceIndicatorProps) {
  const [presence, setPresence] = useState<DoctorPresence>(DoctorPresence.Offline);
  const [manualPresence, setManualPresence] = useState<DoctorPresence | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const appointments = useDbStore(state => state.appointments);

  useEffect(() => {
    if (manualPresence) {
      setPresence(manualPresence);
      setTimeLeft(null);
      return;
    }

    const calculatePresence = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      const doctorAppointments = appointments.filter(
        a => a.doctorId === doctorId && a.date === todayStr && a.status === AppointmentStatus.InProgress
      );

      if (doctorAppointments.length > 0) {
        const activeAppointment = doctorAppointments[0];
        const startTime = parse(activeAppointment.startTime, 'HH:mm', now);
        const endTime = addMinutes(startTime, activeAppointment.duration);

        if (isWithinInterval(now, { start: startTime, end: endTime })) {
          setPresence(DoctorPresence.InSession);
          setTimeLeft(Math.max(0, Math.ceil((endTime.getTime() - now.getTime()) / 60000)));
          return;
        }
      }

      // Check if within working hours (e.g., 09:00 to 18:00)
      const hour = now.getHours();
      if (hour >= 9 && hour < 18) {
        setPresence(DoctorPresence.Available);
      } else {
        setPresence(DoctorPresence.Offline);
      }
      setTimeLeft(null);
    };

    calculatePresence();
    const interval = setInterval(calculatePresence, 60000); // Recalculate every minute

    return () => clearInterval(interval);
  }, [doctorId, appointments, manualPresence]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex items-center justify-center w-3 h-3">
        <div className={cn(
          "absolute w-full h-full rounded-full",
          {
            "bg-green-500": presence === DoctorPresence.Available,
            "bg-yellow-500": presence === DoctorPresence.InSession,
            "bg-red-500": presence === DoctorPresence.OnLeave,
            "bg-gray-400": presence === DoctorPresence.Offline,
          }
        )} />
        {presence === DoctorPresence.InSession && !manualPresence && (
          <div className="absolute w-full h-full rounded-full bg-yellow-500 animate-ping opacity-75" />
        )}
      </div>
      {isEditable ? (
        <select
          value={manualPresence || presence}
          onChange={(e) => setManualPresence(e.target.value as DoctorPresence)}
          className="text-xs font-medium text-gray-600 bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
        >
          <option value={DoctorPresence.Available}>Available</option>
          <option value={DoctorPresence.InSession}>In Session</option>
          <option value={DoctorPresence.OnLeave}>On Leave</option>
          <option value={DoctorPresence.Offline}>Offline</option>
        </select>
      ) : (
        <span className="text-xs font-medium text-gray-600">
          {presence === DoctorPresence.InSession && timeLeft !== null && !manualPresence
            ? `Busy · ${timeLeft} min left`
            : presence}
        </span>
      )}
    </div>
  );
}
