import React, { useState, useMemo } from 'react';
import { Appointment, AppointmentStatus, AppointmentType, Role } from '../../types';
import { useAuthStore } from '../../store/auth';
import { useDbStore } from '../../store/db';
import { format, addDays, startOfWeek, isSameDay, parse, addMinutes, differenceInMinutes, startOfDay } from 'date-fns';
import { cn } from '../../lib/utils';
import { Video, User as UserIcon, RefreshCw, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { AppointmentBlock } from './AppointmentBlock';

interface WeeklyCalendarGridProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 to 20:00

export function WeeklyCalendarGrid({ appointments, onAppointmentClick }: WeeklyCalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'day'>('week');
  const { user } = useAuthStore();
  const users = useDbStore(state => state.users);

  const startDate = view === 'week' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfDay(currentDate);
  const days = Array.from({ length: view === 'week' ? 7 : 1 }, (_, i) => addDays(startDate, i));

  const handlePrev = () => setCurrentDate(addDays(currentDate, view === 'week' ? -7 : -1));
  const handleNext = () => setCurrentDate(addDays(currentDate, view === 'week' ? 7 : 1));
  const handleToday = () => setCurrentDate(new Date());

  const getAppointmentsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return appointments.filter(a => a.date === dayStr);
  };

  const getTopPosition = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startHour = 7;
    const totalMinutes = (hours - startHour) * 60 + minutes;
    return (totalMinutes / 60) * 60; // 60px per hour
  };

  const getHeight = (duration: number) => {
    return (duration / 60) * 60; // 60px per hour
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[800px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(startDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            <button onClick={handlePrev} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button onClick={handleToday} className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
              Today
            </button>
            <button onClick={handleNext} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
          <button
            onClick={() => setView('day')}
            className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", view === 'day' ? "bg-teal-50 text-teal-700" : "text-gray-600 hover:bg-gray-50")}
          >
            Day
          </button>
          <button
            onClick={() => setView('week')}
            className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", view === 'week' ? "bg-teal-50 text-teal-700" : "text-gray-600 hover:bg-gray-50")}
          >
            Week
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="flex min-w-[800px]">
          {/* Time Column */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-white sticky left-0 z-20">
            <div className="h-12 border-b border-gray-200" /> {/* Header spacer */}
            {HOURS.map(hour => (
              <div key={hour} className="h-[60px] border-b border-gray-100 relative">
                <span className="absolute -top-3 right-2 text-xs text-gray-500 font-medium">
                  {`${hour.toString().padStart(2, '0')}:00`}
                </span>
              </div>
            ))}
          </div>

          {/* Days Columns */}
          {days.map((day, index) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div key={index} className="flex-1 border-r border-gray-200 min-w-[120px] relative">
                {/* Day Header */}
                <div className={cn(
                  "h-12 border-b border-gray-200 flex flex-col items-center justify-center sticky top-0 z-10 bg-white",
                  isToday && "bg-teal-50"
                )}>
                  <span className={cn("text-xs font-medium uppercase", isToday ? "text-teal-600" : "text-gray-500")}>
                    {format(day, 'EEE')}
                  </span>
                  <span className={cn("text-lg font-semibold", isToday ? "text-teal-700" : "text-gray-900")}>
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Grid Cells */}
                <div className="relative h-[840px]"> {/* 14 hours * 60px */}
                  {HOURS.map(hour => (
                    <div key={hour} className="h-[60px] border-b border-gray-100 border-dashed" />
                  ))}

                  {/* Appointments */}
                  {dayAppointments.map(appointment => {
                    const top = getTopPosition(appointment.startTime);
                    const height = getHeight(appointment.duration);
                    
                    return (
                      <div
                        key={appointment.id}
                        className="absolute left-1 right-1 z-10 transition-transform hover:scale-[1.02] hover:z-20"
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <AppointmentBlock
                          appointment={appointment}
                          onClick={() => onAppointmentClick(appointment)}
                          compact={height < 45}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
