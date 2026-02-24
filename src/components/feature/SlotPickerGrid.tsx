import React, { useState, useMemo } from 'react';
import { Appointment, AppointmentStatus, AppointmentType, Role } from '../../types';
import { useDbStore } from '../../store/db';
import { format, addMinutes, parse, isBefore, isAfter, isEqual, startOfDay, addDays } from 'date-fns';
import { cn } from '../../lib/utils';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

interface SlotPickerGridProps {
  doctorId: string;
  selectedDate: Date;
  onSelectSlot: (startTime: string, duration: number) => void;
  selectedSlot?: { startTime: string; duration: number };
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 to 20:00
const DURATIONS = [15, 30, 45, 60];

export function SlotPickerGrid({ doctorId, selectedDate, onSelectSlot, selectedSlot }: SlotPickerGridProps) {
  const [duration, setDuration] = useState<number>(30);
  const appointments = useDbStore(state => state.appointments);

  const doctorAppointments = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return appointments.filter(a => a.doctorId === doctorId && a.date === dateStr && a.status !== AppointmentStatus.Cancelled);
  }, [appointments, doctorId, selectedDate]);

  const isSlotAvailable = (time: string, dur: number) => {
    const start = parse(time, 'HH:mm', selectedDate);
    const end = addMinutes(start, dur);
    const now = new Date();

    if (isBefore(start, now)) return false;

    return !doctorAppointments.some(a => {
      const existingStart = parse(a.startTime, 'HH:mm', selectedDate);
      const existingEnd = addMinutes(existingStart, a.duration);
      return (isBefore(start, existingEnd) && isAfter(end, existingStart)) || isEqual(start, existingStart);
    });
  };

  const generateSlots = () => {
    const slots: { time: string; available: boolean }[] = [];
    for (let h = 7; h <= 19; h++) {
      for (let m = 0; m < 60; m += 15) {
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        slots.push({
          time: timeStr,
          available: isSlotAvailable(timeStr, duration)
        });
      }
    }
    return slots;
  };

  const slots = useMemo(generateSlots, [selectedDate, duration, doctorAppointments]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Duration:</span>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500"
          >
            {DURATIONS.map(d => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-[400px] overflow-y-auto p-1">
        {slots.map((slot, index) => {
          const isSelected = selectedSlot?.startTime === slot.time && selectedSlot?.duration === duration;
          
          return (
            <button
              key={index}
              disabled={!slot.available}
              onClick={() => onSelectSlot(slot.time, duration)}
              className={cn(
                "py-2 px-1 text-sm font-medium rounded-md transition-all flex flex-col items-center justify-center gap-1 border",
                {
                  "bg-teal-600 text-white border-teal-600 shadow-md transform scale-105": isSelected,
                  "bg-white text-gray-700 border-gray-200 hover:border-teal-500 hover:text-teal-600": !isSelected && slot.available,
                  "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed line-through": !slot.available
                }
              )}
            >
              <Clock className={cn("w-3 h-3", isSelected ? "text-teal-200" : "text-gray-400")} />
              {slot.time}
            </button>
          );
        })}
      </div>
    </div>
  );
}
