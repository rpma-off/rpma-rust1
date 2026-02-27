"use client";

import { format } from "date-fns";
import { useCalendarStore } from "@/domains/calendar/stores/calendarStore";
import type { CalendarEvent } from "@/types/calendar";
import { useEffect, useRef, useState } from "react";
import { EventSheet } from "./event-sheet";
import { CalendarWeekHeader } from "./calendar-week-header";
import { CalendarHoursColumn } from "./calendar-hours-column";
import { CalendarDayColumn } from "./calendar-day-column";
import { INITIAL_SCROLL_OFFSET } from "./calendar-utils";

export function CalendarView() {
  const { goToNext, goToPrevious, getWeekDays, getCurrentWeekEvents } =
    useCalendarStore();
  const weekDays = getWeekDays();
  const events = getCurrentWeekEvents() as unknown as CalendarEvent[];
  const hoursScrollRef = useRef<HTMLDivElement>(null);
  const daysScrollRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasScrolledRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const today = new Date();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const eventsByDay: Record<string, CalendarEvent[]> = {};
  weekDays.forEach((day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    eventsByDay[dayStr] = events.filter((e: CalendarEvent) => {
      const eventDate = format(new Date(e.startDatetime), "yyyy-MM-dd");
      return eventDate === dayStr;
    });
  });

  const isTodayInWeek = weekDays.some(
    (day: Date) => format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
  );

  useEffect(() => {
    const scrollToInitial = () => {
      if (!hasScrolledRef.current && hoursScrollRef.current) {
        hoursScrollRef.current.scrollTop = INITIAL_SCROLL_OFFSET;
        daysScrollRefs.current.forEach((ref) => {
          if (ref) {
            ref.scrollTop = INITIAL_SCROLL_OFFSET;
          }
        });
        hasScrolledRef.current = true;
      }
    };

    scrollToInitial();
    const timeoutId = setTimeout(scrollToInitial, 100);
    return () => clearTimeout(timeoutId);
  }, [weekDays]);

  const handleHoursScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    daysScrollRefs.current.forEach((ref) => {
      if (ref) {
        ref.scrollTop = scrollTop;
      }
    });
  };

  const handleDayScroll =
    (index: number) => (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop;
      if (hoursScrollRef.current) {
        hoursScrollRef.current.scrollTop = scrollTop;
      }
      daysScrollRefs.current.forEach((ref, idx) => {
        if (ref && idx !== index) {
          ref.scrollTop = scrollTop;
        }
      });
    };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSheetOpen(true);
  };

  return (
    <>
      <EventSheet
        event={selectedEvent}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
      <div className="flex flex-col flex-1 overflow-x-auto w-full" style={{ minHeight: 0 }}>
        <CalendarWeekHeader
          weekDays={weekDays}
          onPreviousWeek={goToPrevious}
          onNextWeek={goToNext}
        />

        <div className="flex flex-1 min-w-full" style={{ minHeight: 0 }}>
          <CalendarHoursColumn
            onScroll={handleHoursScroll}
            scrollRef={hoursScrollRef}
          />

          {weekDays.map((day, dayIndex) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay[dayStr] || [];

            return (
              <CalendarDayColumn
                key={day.toISOString()}
                day={day}
                dayIndex={dayIndex}
                events={dayEvents}
                today={today}
                isTodayInWeek={isTodayInWeek}
                currentTime={currentTime}
                onScroll={handleDayScroll}
                scrollRef={(el) => {
                  daysScrollRefs.current[dayIndex] = el;
                }}
                onEventClick={handleEventClick}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
