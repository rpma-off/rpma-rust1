"use client";

import { format } from "date-fns";
import { useState } from "react";
import {
  Bell,
  Calendar as CalendarIcon,
  Plus,
  Github,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCalendarStore } from "@/lib/stores/calendarStore";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateEventDialog } from "./create-event-dialog";
import { SchedulePopover } from "./schedule-popover";


export function CalendarHeader() {
  const { currentWeekStart } = useCalendarStore();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <>
      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <div className="border-b border-border/20 bg-background">
        <div className="px-3 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2 md:gap-3 flex-nowrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <h1 className="text-sm md:text-base lg:text-lg font-semibold text-foreground truncate mb-0 md:mb-1">
                  {format(currentWeekStart || new Date(), "MMMM dd, yyyy")}
                </h1>
                 <p className="hidden md:block text-xs text-border-light">
                   Calendrier des interventions PPF
                 </p>
              </div>
            </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-foreground truncate">
                  {format(currentWeekStart || new Date(), "MMMM dd, yyyy")}
                </h1>
                 <p className="text-sm text-border-light">
                   Calendrier des interventions PPF
                 </p>
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              {/* Mobile Quick Actions */}
              <div className="flex md:hidden items-center gap-1">
                <Button
                  size="sm"
                  className="h-8 px-3 bg-accent hover:bg-accent/90 text-black font-medium"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="text-xs">Créer</span>
                </Button>
              </div>

              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-9 w-9 hover:bg-border/20"
                    >
                      <Bell className="h-4 w-4 text-border-light" />
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border border-background" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 bg-border border-border/20">
                    <DropdownMenuLabel className="text-foreground">Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border/20" />
                    <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer hover:bg-border/10">
                      <div className="flex items-center gap-2 w-full">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="text-sm font-medium text-foreground flex-1">
                          Réunion confirmée
                        </span>
                        <span className="text-xs text-border-light">
                          il y a 2 min
                        </span>
                      </div>
                      <p className="text-xs text-border-light pl-6">
                        Le point quotidien est confirmé pour demain à 9h00
                      </p>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer hover:bg-border/10">
                      <div className="flex items-center gap-2 w-full">
                        <Clock className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium text-foreground flex-1">
                          Rappel
                        </span>
                        <span className="text-xs text-border-light">
                          il y a 15 min
                        </span>
                      </div>
                      <p className="text-xs text-border-light pl-6">
                        Le Daily Standup commence dans 30 minutes
                      </p>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/20" />
                    <DropdownMenuItem className="justify-center cursor-pointer hover:bg-border/10">
                      <span className="text-xs text-border-light">
                        Voir toutes les notifications
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <SchedulePopover>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border/60 text-border-light hover:bg-border/20 hover:text-foreground"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span className="hidden lg:inline">Planifier</span>
                  </Button>
                </SchedulePopover>

                <Button
                  size="sm"
                  className="bg-accent hover:bg-accent/90 text-black font-medium"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden lg:inline">Créer un événement</span>
                  <span className="lg:hidden">Créer</span>
                </Button>
              </div>

              {/* Theme Toggle - Hidden on mobile for space */}
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
          </div>
        </div>
      </div>
    </>
  );
}
