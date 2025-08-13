// /components/shared/CalendarView.tsx
'use client';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

export function CalendarView() {
  return (
    <div className="p-4 bg-white rounded-lg border shadow-sm h-full">
        <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            weekends={true}
            // We will add events, drop handling, etc. here in the next steps
            // events={[ { title: 'Test Event', date: '2025-08-25' } ]} 
            // droppable={true}
        />
    </div>
  );
}