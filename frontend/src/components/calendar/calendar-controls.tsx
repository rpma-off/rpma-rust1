"use client";

import { useState } from "react";
import {
  Search,
  Settings,
  Calendar as CalendarIcon,
  SlidersHorizontal,
  Check,
  Video,
  VideoOff,
  Users,
  UserX,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCalendarStore } from "@/lib/stores/calendarStore";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function CalendarControls() {
  const {
    searchQuery,
    setSearchQuery,
    goToToday,
    goToDate,
    currentWeekStart,
    eventTypeFilter,
    participantsFilter,
    setEventTypeFilter,
    setParticipantsFilter,
  } = useCalendarStore();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const currentWeek = currentWeekStart ? new Date(currentWeekStart) : new Date();
  const weekStart = currentWeekStart ? format(currentWeekStart, "MMM dd") : '';
  const weekEnd = currentWeekStart ? format(
    new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000),
    "MMM dd yyyy"
  ) : '';

  const hasActiveFilters =
    eventTypeFilter !== "all" || participantsFilter !== "all";

  return (
    <div className="px-3 md:px-6 py-3 md:py-4 border-b border-border/20 bg-background">
      <div className="flex flex-col gap-3 md:gap-0 md:flex-row md:items-center md:justify-between">
        {/* Search and Navigation Row */}
        <div className="flex items-center gap-2 md:gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-border" />
            <Input
              placeholder="Rechercher dans le calendrier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-9 bg-white border-[hsl(var(--rpma-border))] text-foreground placeholder-border focus:border-[hsl(var(--rpma-teal))] focus:ring-[hsl(var(--rpma-teal))]/20"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-border/20"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>

          {/* Mobile Quick Actions */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 border-border/60 text-muted-foreground hover:bg-border/20"
              onClick={goToToday}
            >
              Aujourd&apos;hui
            </Button>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-border/60 text-muted-foreground hover:bg-border/20 hover:text-foreground"
            onClick={goToToday}
          >
            Aujourd&apos;hui
          </Button>

          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-2 justify-start text-left font-normal border-border/60 text-muted-foreground hover:bg-border/20 hover:text-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="text-xs">
                  {weekStart} - {weekEnd}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-border border-border/20" align="start">
              <Calendar
                mode="single"
                selected={currentWeekStart || undefined}
                onSelect={(date) => {
                  if (date) {
                    goToDate(date);
                    setDatePickerOpen(false);
                  }
                }}
                initialFocus
                className="bg-background text-foreground"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 md:gap-3">
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 px-3 gap-2 border-border/60 text-muted-foreground hover:bg-border/20 hover:text-foreground",
                  hasActiveFilters && "bg-[hsl(var(--rpma-teal))]/10 border-[hsl(var(--rpma-teal))]/30 text-[hsl(var(--rpma-teal))]"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Filtres</span>
                {hasActiveFilters && (
                  <span className="h-2 w-2 rounded-full bg-[hsl(var(--rpma-teal))]" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="p-4 w-[320px] bg-border border-border/20"
              align="end"
            >
              <div className="space-y-4 w-full">
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                    <Video className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
                    Type d&apos;événement
                  </h4>
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-border/20"
                      onClick={() => setEventTypeFilter("all")}
                    >
                      <span className="text-sm">Tous les événements</span>
                      {eventTypeFilter === "all" && (
                        <Check className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-border/20"
                      onClick={() => setEventTypeFilter("with-meeting")}
                    >
                      <div className="flex items-center gap-2.5">
                        <Video className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm">Avec réunion</span>
                      </div>
                      {eventTypeFilter === "with-meeting" && (
                        <Check className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-border/20"
                      onClick={() => setEventTypeFilter("without-meeting")}
                    >
                      <div className="flex items-center gap-2.5">
                        <VideoOff className="h-4 w-4 text-border" />
                        <span className="text-sm">Sans réunion</span>
                      </div>
                      {eventTypeFilter === "without-meeting" && (
                        <Check className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
                      )}
                    </Button>
                  </div>
                </div>

                <Separator className="bg-border/20" />

                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                    <Users className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
                    Participants
                  </h4>
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-border/20"
                      onClick={() => setParticipantsFilter("all")}
                    >
                      <span className="text-sm">Tous</span>
                      {participantsFilter === "all" && (
                        <Check className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-border/20"
                      onClick={() => setParticipantsFilter("with-participants")}
                    >
                      <div className="flex items-center gap-2.5">
                        <Users className="h-4 w-4 text-border" />
                        <span className="text-sm">Avec participants</span>
                      </div>
                      {participantsFilter === "with-participants" && (
                        <Check className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-border/20"
                      onClick={() => setParticipantsFilter("without-participants")}
                    >
                      <div className="flex items-center gap-2.5">
                        <UserX className="h-4 w-4 text-border" />
                        <span className="text-sm">Sans participants</span>
                      </div>
                      {participantsFilter === "without-participants" && (
                        <Check className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
                      )}
                    </Button>
                  </div>
                </div>

                {hasActiveFilters && (
                  <>
                    <Separator className="bg-border/20" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-9 border-border/60 text-muted-foreground hover:bg-border/20 hover:text-foreground"
                      onClick={() => {
                        setEventTypeFilter("all");
                        setParticipantsFilter("all");
                      }}
                    >
                      Effacer tous les filtres
                    </Button>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
