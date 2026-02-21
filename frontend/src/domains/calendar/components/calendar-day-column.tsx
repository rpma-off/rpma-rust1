"use client";

import type { CalendarEvent } from "@/types/calendar";
import {
  HOURS_24,
  HOUR_HEIGHT,
  getEventTop,
  getEventHeight,
} from "./calendar-utils";
import { EventCard } from "./event-card";
import { CurrentTimeIndicator } from "./current-time-indicator";

interface CalendarDayColumnProps {
  day: Date;
  dayIndex: number;
  events: CalendarEvent[];
  today: Date;
  isTodayInWeek: boolean;
  currentTime: Date;
  onScroll: (index: number) => (e: React.UIEvent<HTMLDivElement>) => void;
  scrollRef: (el: HTMLDivElement | null) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarDayColumn({
  day,
  dayIndex,
  events,
  today,
  isTodayInWeek,
  currentTime,
  onScroll,
  scrollRef,
  onEventClick,
}: CalendarDayColumnProps) {
  return (
    <div
      ref={scrollRef}
      onScroll={onScroll(dayIndex)}
      className="flex-1 border-r border-border last:border-r-0 relative min-w-44 overflow-y-auto"
    >
      {HOURS_24.map((hour) => (
        <div
          key={hour}
          className="border-b border-border"
          style={{ height: `${HOUR_HEIGHT}px` }}
        />
      ))}

      <CurrentTimeIndicator
        day={day}
        today={today}
        isTodayInWeek={isTodayInWeek}
        currentTime={currentTime}
      />

      {events.map((event) => {
        const startDate = new Date(event.startDatetime);
        const endDate = new Date(event.endDatetime);
        const startTime = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
        const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
        const top = getEventTop(startTime);
        const height = getEventHeight(startTime, endTime);

        return (
          <EventCard
            key={event.id}
            event={event}
            style={{
              top: `${top + 4}px`,
              height: `${height - 8}px`,
            }}
            onClick={() => onEventClick(event)}
          />
        );
      })}
    </div>
  );
}
