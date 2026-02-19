"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCalendarStore } from "@/lib/stores/calendarStore";
import { useAuth } from "@/domains/auth";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import type { CreateEventInput } from "@/types/calendar";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEventDialog({
  open,
  onOpenChange,
}: CreateEventDialogProps) {
  const { addEvent, goToDate } = useCalendarStore();
  const { user } = useAuth();
  const { t } = useTranslation();
  const sessionToken = user?.token || "";
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [timezone, setTimezone] = useState("");
  const [participants, setParticipants] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !date || !startTime || !endTime || !sessionToken) {
      return;
    }

    // Combine date and time to create ISO datetime strings
    const startDateTime = new Date(`${format(date, "yyyy-MM-dd")}T${startTime}`);
    const endDateTime = new Date(`${format(date, "yyyy-MM-dd")}T${endTime}`);

    const participantsList = participants
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const newEvent: CreateEventInput = {
      title,
      startDatetime: startDateTime.toISOString(),
      endDatetime: endDateTime.toISOString(),
      allDay: false,
      timezone: timezone || "GMT+7 Pontianak",
      eventType: "meeting",
      participants: participantsList.length > 0
        ? participantsList.map((p) => ({ id: p, name: p, status: "accepted" as const }))
        : [{ id: "user1", name: "User", status: "accepted" as const }],
      meetingLink: meetingLink || undefined,
      isVirtual: !!meetingLink,
      reminders: [30], // 30 minutes before
      tags: [],
    };

    await addEvent({ ...newEvent });
    goToDate(date);

    setTitle("");
    setDate(new Date());
    setStartTime("");
    setEndTime("");
    setMeetingLink("");
    setTimezone("");
    setParticipants("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('schedule.createEvent')}</DialogTitle>
          <DialogDescription>
            {t('schedule.createEventDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">{t('schedule.title')}</Label>
              <Input
                id="title"
                placeholder={t('schedule.eventTitlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>{t('schedule.date')}</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {date ? format(date, "PPP") : <span>{t('schedule.pickDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => {
                      setDate(selectedDate);
                      setDatePickerOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">{t('schedule.startTime')}</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="endTime">{t('schedule.endTime')}</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="participants">
                {t('schedule.participants')}
              </Label>
              <Input
                id="participants"
                placeholder="user1, user2, user3"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="meetingLink">{t('schedule.meetingLink')}</Label>
              <Input
                id="meetingLink"
                type="url"
                placeholder="https://meet.google.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="timezone">{t('schedule.timezone')}</Label>
              <Input
                id="timezone"
                placeholder="GMT+7 Pontianak"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('schedule.createEvent')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
