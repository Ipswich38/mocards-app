import { useState } from 'react';

interface CalendarPickerProps {
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  minDate?: string;
  maxDate?: string;
  disabledDays?: number[]; // 0 = Sunday, 1 = Monday, etc.
  workingHours?: {
    start: string;
    end: string;
  };
  className?: string;
}

export function CalendarPicker({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  minDate,
  maxDate,
  disabledDays = [0, 6], // Disable weekends by default
  workingHours = { start: '08:00', end: '17:00' },
  className = ''
}: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = selectedDate ? new Date(selectedDate) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const [viewMode, setViewMode] = useState<'calendar' | 'time'>('calendar');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Generate calendar days
  const generateCalendarDays = () => {
    const firstDay = new Date(currentMonth);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) { // 6 weeks
      const dateStr = current.toISOString().split('T')[0];
      const isCurrentMonth = current.getMonth() === currentMonth.getMonth();
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDate;
      const isDisabled =
        disabledDays.includes(current.getDay()) ||
        (minDate && dateStr < minDate) ||
        (maxDate && dateStr > maxDate) ||
        dateStr < todayStr; // Disable past dates

      days.push({
        date: new Date(current),
        dateStr,
        isCurrentMonth,
        isToday,
        isSelected,
        isDisabled,
        day: current.getDate()
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // Generate time slots
  const generateTimeSlots = () => {
    const slots = [];
    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = workingHours.end.split(':').map(Number);

    let hour = startHour;
    let minute = startMinute;

    while (hour < endHour || (hour === endHour && minute <= endMinute)) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeStr);

      minute += 30;
      if (minute >= 60) {
        minute = 0;
        hour++;
      }
    }

    return slots;
  };

  const calendarDays = generateCalendarDays();
  const timeSlots = generateTimeSlots();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateSelect = (dateStr: string) => {
    onDateChange(dateStr);
    setViewMode('time');
  };

  const handleTimeSelect = (time: string) => {
    onTimeChange(time);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-medium text-gray-900">
          {viewMode === 'calendar' ? 'Select Date' : 'Select Time'}
        </h3>
        {viewMode === 'time' && (
          <button
            onClick={() => setViewMode('calendar')}
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded"
          >
            ← Change Date
          </button>
        )}
      </div>

      {viewMode === 'calendar' && (
        <div>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h4 className="text-base sm:text-lg font-medium text-center">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h4>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1 sm:py-2">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.charAt(0)}</span>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <button
                key={index}
                onClick={() => !day.isDisabled && handleDateSelect(day.dateStr)}
                disabled={day.isDisabled}
                className={`
                  p-2 sm:p-3 text-xs sm:text-sm rounded-lg transition-colors relative touch-manipulation min-h-[2.5rem] sm:min-h-[3rem]
                  ${!day.isCurrentMonth
                    ? 'text-gray-300'
                    : day.isDisabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100'
                  }
                  ${day.isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                  ${day.isToday && !day.isSelected ? 'bg-blue-100 text-blue-600 font-medium' : ''}
                `}
              >
                {day.day}
                {day.isToday && (
                  <span className="absolute top-0.5 sm:top-1 right-0.5 sm:right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></span>
                )}
              </button>
            ))}
          </div>

          {selectedDate && (
            <div className="mt-4 sm:mt-6 p-3 bg-blue-50 rounded-lg">
              <div className="text-xs sm:text-sm text-blue-700">
                <strong>Selected Date:</strong> {new Date(selectedDate).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'time' && selectedDate && (
        <div>
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs sm:text-sm text-gray-600">
              <strong>Date:</strong> {new Date(selectedDate).toLocaleDateString()}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {timeSlots.map(time => (
              <button
                key={time}
                onClick={() => handleTimeSelect(time)}
                className={`
                  p-2 sm:p-3 text-xs sm:text-sm rounded-lg transition-colors border touch-manipulation min-h-[2.5rem]
                  ${selectedTime === time
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-300 active:bg-blue-100'
                  }
                `}
              >
                {time}
              </button>
            ))}
          </div>

          {selectedTime && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="text-xs sm:text-sm text-green-700">
                <strong>Selected Time:</strong> {selectedTime}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {selectedDate && selectedTime && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg border-t border-gray-200">
          <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-2">Appointment Summary</h4>
          <div className="text-xs sm:text-sm text-gray-600 space-y-1">
            <div><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString()}</div>
            <div><strong>Time:</strong> {selectedTime}</div>
            <div><strong>Day:</strong> {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long' })}</div>
          </div>
        </div>
      )}
    </div>
  );
}