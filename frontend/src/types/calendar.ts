export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;

  // Temporal
  startDatetime: string; // ISO 8601
  endDatetime: string;
  allDay: boolean;
  timezone: string;

  // Type and category
  eventType: EventType;
  category?: string;

  // Relations
  taskId?: string;
  clientId?: string;
  technicianId?: string;

  // Meeting details
  location?: string;
  meetingLink?: string;
  isVirtual: boolean;

  // Participants
  participants: EventParticipant[];

  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: string;
  parentEventId?: string;

  // Reminders
  reminders: number[]; // Minutes before event

  // Status and metadata
  status: EventStatus;
  color?: string;
  tags: string[];
  notes?: string;

  // Sync and audit
  synced: boolean;
  lastSyncedAt?: number;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: number;
  deletedBy?: string;
}

export type EventType = 'meeting' | 'appointment' | 'task' | 'reminder' | 'other';

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';

export interface EventParticipant {
  id: string;
  name: string;
  email?: string;
  status: ParticipantStatus;
}

export type ParticipantStatus = 'accepted' | 'declined' | 'tentative' | 'needsAction';

export interface CreateEventInput {
  title: string;
  description?: string;
  startDatetime: string;
  endDatetime: string;
  allDay?: boolean;
  timezone?: string;
  eventType?: EventType;
  category?: string;
  taskId?: string;
  clientId?: string;
  location?: string;
  meetingLink?: string;
  isVirtual?: boolean;
  participants?: EventParticipant[];
  reminders?: number[];
  color?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  startDatetime?: string;
  endDatetime?: string;
  allDay?: boolean;
  timezone?: string;
  eventType?: EventType;
  category?: string;
  taskId?: string;
  clientId?: string;
  location?: string;
  meetingLink?: string;
  isVirtual?: boolean;
  participants?: EventParticipant[];
  status?: EventStatus;
  reminders?: number[];
  color?: string;
  tags?: string[];
  notes?: string;
}