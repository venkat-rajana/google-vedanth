import React from 'react';
import { Appointment, AppointmentStatus, AppointmentType, Role } from '../../types';
import { useDbStore } from '../../store/db';
import { useAuthStore } from '../../store/auth';
import { cn } from '../../lib/utils';
import { Video, User as UserIcon, RefreshCw, Clock } from 'lucide-react';

interface AppointmentBlockProps {
  appointment: Appointment;
  onClick: () => void;
  compact?: boolean;
}

export function AppointmentBlock({ appointment, onClick, compact = false }: AppointmentBlockProps) {
  const users = useDbStore(state => state.users);
  const { user: currentUser } = useAuthStore();

  const patient = users.find(u => u.id === appointment.patientId);
  const doctor = users.find(u => u.id === appointment.doctorId);

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.Scheduled: return 'bg-blue-100 border-blue-200 text-blue-800';
      case AppointmentStatus.CheckedIn: return 'bg-orange-100 border-orange-200 text-orange-800';
      case AppointmentStatus.InProgress: return 'bg-purple-100 border-purple-200 text-purple-800';
      case AppointmentStatus.Completed: return 'bg-green-100 border-green-200 text-green-800';
      case AppointmentStatus.Cancelled:
      case AppointmentStatus.NoShow: return 'bg-gray-100 border-gray-200 text-gray-500 line-through opacity-70';
      default: return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  const getTypeIcon = (type: AppointmentType) => {
    switch (type) {
      case AppointmentType.InPerson: return <UserIcon className="w-3 h-3" />;
      case AppointmentType.Video: return <Video className="w-3 h-3" />;
      case AppointmentType.FollowUp: return <RefreshCw className="w-3 h-3" />;
    }
  };

  const displayName = currentUser?.role === Role.Patient 
    ? `Dr. ${doctor?.name.replace('Dr. ', '')}` 
    : patient?.name || 'Unknown Patient';

  return (
    <div
      onClick={onClick}
      className={cn(
        "w-full h-full rounded-md border p-1.5 flex flex-col gap-0.5 cursor-pointer overflow-hidden shadow-sm transition-shadow hover:shadow-md",
        getStatusColor(appointment.status)
      )}
      title={`${displayName} - ${appointment.startTime} (${appointment.duration}m)`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-semibold truncate leading-tight">
          {displayName}
        </span>
        {!compact && (
          <div className="flex items-center gap-1 opacity-75">
            {getTypeIcon(appointment.type)}
          </div>
        )}
      </div>
      
      {!compact && (
        <div className="flex items-center gap-1 text-[10px] opacity-80 mt-auto">
          <Clock className="w-3 h-3" />
          <span>{appointment.startTime}</span>
          <span className="mx-0.5">•</span>
          <span>{appointment.duration}m</span>
        </div>
      )}
    </div>
  );
}
